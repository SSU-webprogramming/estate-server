import { Injectable, Inject } from '@nestjs/common';
import { TextGeneratorPort, FileWithMimeType } from '@/modules/estate-analysis-report/ports/text-generator.port';
import { ANALYSIS_CACHE_STRATEGY_PORT } from '@/modules/estate-analysis-report/ports/analysis-cache-strategy.port';
import type { AnalysisCacheStrategyPort } from '@/modules/estate-analysis-report/ports/analysis-cache-strategy.port';
import { SYSTEM_PROMPT } from '@/modules/estate-analysis-report/prompts/system.prompt';
import { Document } from '@/modules/document/entities/document.entity';
import { EstateService } from '@/modules/estate/services/estate.service';
import { EstateAnalysisReport } from '@/modules/estate-analysis-report/entities/estate-analysis-report.entity';
import { S3Port } from '@/common/ports/s3.port';
import { CreateEstateAnalysisDto } from '@/modules/estate-analysis-report/dto/request/estate-analysis-req.dto';
import { EstateAnalysisReportResponseDto } from '../dto/response/estate-analysis-report-response.dto';
import { EstateAnalysisReportMapper } from '../mapper/estate-analysis-report.mapper';
import { EstateAnalysisReportCacheService } from './estate-analysis-report-cache.service';
import { SearchEstateAnalysisDto } from '../dto/request/search-estate-analysis.dto';
import { PaginationResponseDto } from '@/common/dto/pagination-response.dto';
import { DocumentProcessingService } from './document-processing.service';
import { ErrorHandler } from '@/common/utils/error-handler.util';
import { EstateAnalysisReportRepository } from '../repositories/estate-analysis-report.repository';
import { DocumentRepository } from '@/modules/document/repositories/document.repository';
@Injectable()
export class EstateAnalysisReportService {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly estateAnalysisReportRepository: EstateAnalysisReportRepository,
    private readonly textGeneratorPort: TextGeneratorPort,
    private readonly s3Port: S3Port,
    private readonly estateAnalysisReportCacheService: EstateAnalysisReportCacheService,
    private readonly documentProcessingService: DocumentProcessingService,
    private readonly estateService: EstateService,
    @Inject(ANALYSIS_CACHE_STRATEGY_PORT)
    private readonly analysisCacheStrategyPort: AnalysisCacheStrategyPort
  ) {}

  /**
   * 단일 부동산 문서 이미지를 AI로 분석
   * @param fileBuffer - 분석할 문서의 버퍼
   * @param mimeType - 문서의 MIME 타입
   * @returns AI 분석 결과 텍스트
   */
  async analyzeEsate(fileBuffer: Buffer, mimeType: string): Promise<string> {
    // 1. 사용자 프롬프트 생성
    const userPrompt = `다음 문서를 분석하세요.`;

    // 2. AI 텍스트 생성 포트를 통해 이미지 분석 요청
    return await this.textGeneratorPort.generateTextFromImage(
      SYSTEM_PROMPT,
      userPrompt,
      fileBuffer,
      mimeType,
    );
  }

  /**
   * 문서들과 함께 부동산 분석 수행 (핵심 비즈니스 로직)
   * 캐시 전략을 활용하여 중복 AI 분석을 최소화
   * @param userId - 사용자 ID
   * @param createEstateAnalysisDto - 부동산 분석 요청 DTO
   * @returns 부동산 분석 결과 응답 DTO
   */
  async analyzeEstateWithDocuments(
    userId: number,
    createEstateAnalysisDto: CreateEstateAnalysisDto,
  ): Promise<EstateAnalysisReportResponseDto> {
    // 1. Estate DTO 생성 및 매핑 (Mapper 사용)
    const createEstateDto = EstateAnalysisReportMapper.toCreateEstateDto(createEstateAnalysisDto);

    // 2. Estate 생성 및 저장 (DTO 반환으로 계층 분리 원칙 준수)
    const savedEstateDto = await this.estateService.createEstateForAnalysis(userId, createEstateDto);

    // 3. Document 조회 및 유효성 검증
    const documents = await this.documentRepository.findByIds(createEstateAnalysisDto.documentIds);
    if (!documents || documents.length === 0) {
      throw new Error('분석할 문서를 찾을 수 없습니다.');
    }

    // 4. Document에 Estate 정보 할당 및 저장
    for (const document of documents) {
      document.estateId = savedEstateDto.estateId;
    }
    await this.documentRepository.save(documents);

    // 5. OCR 처리 및 텍스트 추출
    const { ocrText, documentData } = await this.documentProcessingService.processOcrAndExtractText(documents);

    // 6. OCR 텍스트에서 주소 추출 (실패 시 입력 주소 사용)
    const extractedAddress = this.extractAddressFromOcrText(ocrText) || createEstateAnalysisDto.address;

    // 7. 캐시 조회 여부 결정
    let cachedAnalysis: EstateAnalysisReport | null = null;
    const forceReAnalyze = createEstateAnalysisDto.forceReAnalyze ?? false;

    // 8. 강제 재분석이 아니고 주소가 있으면 캐시 조회
    if (!forceReAnalyze && extractedAddress) {
      console.log(`[EstateAnalysisReport] 캐시 검색 시도: ${extractedAddress}`);
      cachedAnalysis = await this.analysisCacheStrategyPort.findCachedAnalysis(
        extractedAddress,
        userId,
      );
    }

    let analysisReport: EstateAnalysisReport;

    // 9. 캐시 히트 여부에 따라 분기 처리
    if (cachedAnalysis) {
      // 9-1. 캐시된 분석 결과 재사용
      console.log(`[EstateAnalysisReport] 캐시 히트! 기존 분석 재사용 (원본 ID: ${cachedAnalysis.id})`);
      analysisReport = await this.copyAnalysisFromCache(savedEstateDto.estateId, cachedAnalysis);
    } else {
      // 9-2. AI를 통한 새로운 분석 수행
      console.log(`[EstateAnalysisReport] 캐시 미스. AI 분석 요청`);
      analysisReport = await this.performAiAnalysis(
        savedEstateDto.estateId,
        documents,
        ocrText,
        documentData,
      );
    }

    // 10. 사용하지 않는 문서 삭제
    await this.deleteUnusedDocuments(createEstateAnalysisDto.documentIds);

    // 11. 새로운 분석인 경우 캐시 저장
    if (!cachedAnalysis && extractedAddress && analysisReport.estateId) {
      await this.analysisCacheStrategyPort.saveCachedAnalysis(
        extractedAddress,
        userId,
        analysisReport.estateId,
      );
    }

    // 12. 분석 결과 캐시 무효화
    if (analysisReport.estateId) {
      await this.estateAnalysisReportCacheService.invalidate(analysisReport.estateId);
    }

    // 13. 응답 DTO로 변환 후 반환
    return EstateAnalysisReportMapper.toResponseDto(analysisReport);
  }

  /**
   * OCR 텍스트에서 주소 정보 추출
   * 여러 패턴을 시도하여 주소를 찾음
   * @param ocrText - OCR로 추출된 텍스트
   * @returns 추출된 주소 또는 null
   */
  private extractAddressFromOcrText(ocrText: string): string | null {
    // 1. OCR 텍스트가 없으면 null 반환
    if (!ocrText) {
      return null;
    }

    // 2. 주소 추출을 위한 정규식 패턴 정의
    const addressPatterns = [
      /([가-힣]+[시도]\s+[가-힣]+[시군구]\s+[가-힣\s\d-]+)/g, // 시도 + 시군구 패턴
      /소재지[:\s]*([가-힣\s\d-]+)/g,                           // 소재지 키워드 패턴
      /주소[:\s]*([가-힣\s\d-]+)/g,                             // 주소 키워드 패턴
    ];

    // 3. 각 패턴을 순차적으로 시도
    for (const pattern of addressPatterns) {
      const matches = ocrText.match(pattern);
      if (matches && matches.length > 0) {
        // 4. 매칭 성공 시 불필요한 키워드 제거 후 반환
        return matches[0].replace(/소재지[:\s]*|주소[:\s]*/, '').trim();
      }
    }

    // 5. 모든 패턴 실패 시 null 반환
    return null;
  }

  /**
   * 캐시된 분석 결과를 새로운 Estate에 복사
   * 기존 분석 결과를 재사용하여 AI 호출 비용 절감
   * @param estateId - 새로 생성된 Estate ID (Entity가 아닌 ID만 사용하여 계층 분리)
   * @param cachedAnalysis - 캐시된 분석 리포트
   * @returns 새로 생성된 분석 리포트
   */
  private async copyAnalysisFromCache(
    estateId: number,
    cachedAnalysis: EstateAnalysisReport,
  ): Promise<EstateAnalysisReport> {
    // 1. 캐시된 분석 결과를 DTO로 변환
    const cachedData = EstateAnalysisReportMapper.toCachedAnalysisDto(cachedAnalysis);
    
    // 2. DTO와 Estate ID를 사용하여 분석 리포트 데이터로 변환
    const analysisReportData = EstateAnalysisReportMapper.fromCachedAnalysis(estateId, cachedData);
    
    // 3. 엔티티 생성
    const analysisReport = this.estateAnalysisReportRepository.create(analysisReportData);

    // 4. 데이터베이스에 저장 후 반환
    return await this.estateAnalysisReportRepository.save(analysisReport);
  }

  /**
   * AI를 사용하여 실제 부동산 문서 분석 수행
   * 여러 이미지를 함께 분석하여 종합적인 리포트 생성
   * @param estateId - Estate ID (Entity가 아닌 ID만 사용하여 계층 분리)
   * @param documents - 분석할 문서 목록
   * @param ocrText - OCR로 추출된 텍스트
   * @param documentData - 문서 데이터 배열 (버퍼, MIME 타입 등)
   * @returns 생성된 분석 리포트
   */
  private async performAiAnalysis(
    estateId: number,
    documents: Document[],
    ocrText: string,
    documentData: Array<{ base64: string; buffer: Buffer; mimeType: string; name: string }>,
  ): Promise<EstateAnalysisReport> {
    // 1. AI 분석을 위한 파일 버퍼 배열 생성
    const fileBuffers: FileWithMimeType[] = documentData.map((data) => ({
      buffer: data.buffer,
      mimeType: data.mimeType,
    }));

    // 2. 문서와 OCR 텍스트를 기반으로 분석 프롬프트 생성
    const userPrompt = this.documentProcessingService.buildAnalysisPrompt(documents, ocrText);

    // 3. AI 텍스트 생성 포트를 통해 다중 이미지 분석 요청
    const analysisResult = await this.textGeneratorPort.generateTextFromImages(
      SYSTEM_PROMPT,
      userPrompt,
      fileBuffers,
    );

    // 4. AI 응답 JSON 파싱 (에러 처리 포함)
    const parsedAnalysis: any = ErrorHandler.parseJson(analysisResult, {});

    // 5. 파싱된 결과를 AI 분석 결과 DTO로 변환 (estateId 전달)
    const aiResult = EstateAnalysisReportMapper.toAiAnalysisResultDto(parsedAnalysis, estateId, analysisResult);

    // 6. AI 결과 DTO와 Estate ID를 사용하여 분석 리포트 엔티티 데이터로 변환
    const analysisReportData = EstateAnalysisReportMapper.fromAiAnalysisResult(estateId, aiResult);
    
    // 7. 엔티티 생성
    const analysisReport = this.estateAnalysisReportRepository.create(analysisReportData);

    // 8. 분석 결과 로깅
    console.log('[EstateAnalysisReport] AI 분석 완료:', {
      estateId: analysisReport.estateId,
      safetyScore: analysisReport.safetyScore,
    });

    // 9. 데이터베이스에 저장 후 반환
    return await this.estateAnalysisReportRepository.save(analysisReport);
  }


  /**
   * 연결되지 않은 문서 삭제 (S3 및 DB)
   * Estate에 연결되지 않은 임시 문서들을 정리
   * @param usedDocumentIds - 현재 사용 중인 문서 ID 목록
   */
  private async deleteUnusedDocuments(usedDocumentIds: number[]): Promise<void> {
    try {
      // 1. Estate와 연결되지 않은 문서 조회
      const unlinkedDocuments = await this.documentRepository.findUnlinked();

      // 2. 현재 사용 중인 문서를 제외하고 삭제 대상 필터링
      const documentsToDelete = unlinkedDocuments.filter(
        (doc) => !usedDocumentIds.includes(doc.docId),
      );

      // 3. S3에서 파일 일괄 삭제 (배치 에러 처리 포함)
      await ErrorHandler.handleBatchOperation(
        documentsToDelete,
        async (document) => {
          await this.s3Port.delete(document.s3Key);
        },
        'S3 파일 삭제',
      );

      // 4. DB에서 문서 레코드 삭제
      if (documentsToDelete.length > 0) {
        const docIdsToDelete = documentsToDelete.map((doc) => doc.docId);
        await this.documentRepository.delete(docIdsToDelete);
        console.log(`[EstateAnalysisReport] 미사용 문서 삭제 완료: ${docIdsToDelete.length}건`);
      }
    } catch (error) {
      // 문서 삭제 실패는 치명적이지 않으므로 로깅만 수행
      console.error('[EstateAnalysisReport] 미사용 문서 삭제 실패:', error);
    }
  }

  /**
   * Estate ID로 분석 리포트 조회
   * @param estateId - Estate ID
   * @returns 분석 리포트 엔티티 또는 null
   */
  async findByEstateId(
    estateId: number,
  ): Promise<EstateAnalysisReport | null> {
    return await this.estateAnalysisReportRepository.findByEstateId(estateId);
  }

  /**
   * 분석 결과 조회 (캐시 우선)
   * Redis 캐시를 먼저 확인하고, 없으면 DB에서 조회
   * @param estateId - Estate ID
   * @returns 분석 리포트 응답 DTO
   */
  async getAnalysisResult(estateId: number): Promise<EstateAnalysisReportResponseDto> {
    // 1. Redis 캐시에서 조회 시도
    const cached = await this.estateAnalysisReportCacheService.get(estateId);
    if (cached) {
      console.log(`[EstateAnalysisReport] 캐시 조회 성공: estateId=${estateId}`);
      return cached;
    }

    // 2. 캐시 미스 시 DB에서 조회
    const analysisReport = await this.findByEstateId(estateId);

    // 3. 데이터가 없으면 빈 응답 반환
    if (!analysisReport) {
      console.log(`[EstateAnalysisReport] 분석 결과 없음: estateId=${estateId}`);
      return EstateAnalysisReportMapper.emptyResponse();
    }

    // 4. 응답 DTO로 변환
    const responseDto = EstateAnalysisReportMapper.toResponseDto(analysisReport);

    // 5. Redis 캐시에 저장
    await this.estateAnalysisReportCacheService.set(estateId, responseDto);

    return responseDto;
  }

  /**
   * 사용자의 분석 리포트 목록 조회 (페이징)
   * @param userId - 사용자 ID
   * @param query - 검색 조건 DTO
   * @returns 페이지네이션된 분석 리포트 목록
   */
  async findAll(userId: number, query: SearchEstateAnalysisDto): Promise<PaginationResponseDto<EstateAnalysisReportResponseDto>> {
    return await this.estateAnalysisReportRepository.findAll(userId, query);
  }
}
