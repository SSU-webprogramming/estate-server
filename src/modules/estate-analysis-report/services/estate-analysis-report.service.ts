import { Injectable, Inject } from '@nestjs/common';
import { TextGeneratorPort, FileWithMimeType } from '@/modules/estate-analysis-report/ports/text-generator.port';
import { ANALYSIS_CACHE_STRATEGY_PORT } from '@/modules/estate-analysis-report/ports/analysis-cache-strategy.port';
import type { AnalysisCacheStrategyPort } from '@/modules/estate-analysis-report/ports/analysis-cache-strategy.port';
import { SYSTEM_PROMPT } from '@/modules/estate-analysis-report/prompts/system.prompt';
import { DOCUMENT_VALIDATOR_SYSTEM_PROMPT, buildDocumentValidationPrompt } from '@/modules/estate-analysis-report/prompts/document-validator.prompt';
import { Document } from '@/modules/document/entities/document.entity';
import { EstateService } from '@/modules/estate/services/estate.service';
import { EstateAnalysisReport } from '@/modules/estate-analysis-report/entities/estate-analysis-report.entity';
import { S3Port } from '@/common/ports/s3.port';
import { CreateEstateAnalysisDto } from '@/modules/estate-analysis-report/dto/request/estate-analysis-req.dto';
import { EstateAnalysisReportResponseDto } from '@/modules/estate-analysis-report/dto/response/estate-analysis-report-response.dto';
import { EstateAnalysisReportMapper } from '@/modules/estate-analysis-report/mapper/estate-analysis-report.mapper';
import { EstateAnalysisReportCacheService } from '@/modules/estate-analysis-report/services/estate-analysis-report-cache.service';
import { SearchEstateAnalysisDto } from '@/modules/estate-analysis-report/dto/request/search-estate-analysis.dto';
import { PaginationResponseDto } from '@/common/dto/pagination-response.dto';
import { DocumentProcessingService } from '@/modules/estate-analysis-report/services/document-processing.service';
import { ErrorHandler } from '@/common/utils/error-handler.util';
import { EstateAnalysisReportRepository } from '@/modules/estate-analysis-report/repositories/estate-analysis-report.repository';
import { DocumentRepository } from '@/modules/document/repositories/document.repository';
import { RedisService } from '@/modules/redis/redis.service';
import { Duration } from 'js-joda';
import { DocumentValidationResultDto } from '@/modules/estate-analysis-report/dto/document-validation-result.dto';
import { CustomException } from '@/common/errors/custom-exception';
import { ErrorCode } from '@/common/errors/error';
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
    private readonly redisService: RedisService,
    @Inject(ANALYSIS_CACHE_STRATEGY_PORT)
    private readonly analysisCacheStrategyPort: AnalysisCacheStrategyPort
  ) {}

  async analyzeEsate(fileBuffer: Buffer, mimeType: string): Promise<string> {
    const userPrompt = '다음 문서를 분석하세요.';
    return this.textGeneratorPort.generateTextFromImage(SYSTEM_PROMPT, userPrompt, fileBuffer, mimeType);
  }

  /**
   * 문서 기반 부동산 분석 수행
   * 캐시 전략을 활용하여 중복 AI 분석 최소화
   */
  async analyzeEstateWithDocuments(
    userId: number,
    createEstateAnalysisDto: CreateEstateAnalysisDto,
  ): Promise<EstateAnalysisReportResponseDto> {
    // Estate 레코드 생성
    const savedEstateDto = await this.createEstateRecord(userId, createEstateAnalysisDto);
    
    // 문서 검증 및 Estate 연결
    const documents = await this.validateAndAttachDocuments(createEstateAnalysisDto.documentIds, savedEstateDto.estateId);
    
    // OCR 처리 및 주소 추출
    const { ocrText, documentData } = await this.documentProcessingService.processOcrAndExtractText(documents);
    const extractedAddress = this.extractAddressFromOcrText(ocrText) || createEstateAnalysisDto.address;

    if (!extractedAddress) {
      throw new CustomException(ErrorCode.DOCUMENT_ANALYSIS_FAILED);
    }

    // 캐시 활용 분석 수행
    const analysisReport = await this.performAnalysisWithCaching(
      createEstateAnalysisDto,
      savedEstateDto.estateId,
      extractedAddress,
      documents,
      ocrText,
      documentData,
      userId,
    );

    // 후처리 (미사용 문서 삭제, 캐시 저장)
    await this.finalizeAnalysis(createEstateAnalysisDto.documentIds, extractedAddress, analysisReport, userId);

    return EstateAnalysisReportMapper.toResponseDto(analysisReport);
  }

  private async createEstateRecord(userId: number, dto: CreateEstateAnalysisDto): Promise<any> {
    const createEstateDto = EstateAnalysisReportMapper.toCreateEstateDto(dto);
    return this.estateService.createEstateForAnalysis(userId, createEstateDto);
  }

  private async validateAndAttachDocuments(documentIds: number[], estateId: number): Promise<Document[]> {
    // 문서 조회
    const documents = await this.documentRepository.findByIds(documentIds);
    
    if (!documents || documents.length === 0) {
      throw new Error('분석할 문서를 찾을 수 없습니다.');
    }

    // 부동산 문서 여부 검증
    this.validateDocumentsAreRealEstate(documents);
    
    // Estate에 문서 연결
    await this.attachDocumentsToEstate(documents, estateId);

    return documents;
  }

  private validateDocumentsAreRealEstate(documents: Document[]): void {
    const nonRealEstateDocuments = documents.filter(doc => doc.isRealEstateDocument === false);
    
    if (nonRealEstateDocuments.length > 0) {
      throw new CustomException(
        ErrorCode.NOT_REAL_ESTATE_DOCUMENT,
        '부동산 문서가 아니라고 판별된 문서가 포함되어 있습니다. 파일을 다시 올려주세요.',
      );
    }
  }

  private async attachDocumentsToEstate(documents: Document[], estateId: number): Promise<void> {
    for (const document of documents) {
      document.estateId = estateId;
    }
    await this.documentRepository.save(documents);
  }

  private async performAnalysisWithCaching(
    dto: CreateEstateAnalysisDto,
    estateId: number,
    extractedAddress: string | null,
    documents: Document[],
    ocrText: string,
    documentData: Array<{ base64: string; buffer: Buffer; mimeType: string; name: string }>,
    userId: number,
  ): Promise<EstateAnalysisReport> {
    const forceReAnalyze = dto.forceReAnalyze ?? false;
    
    // 캐시 조회 시도
    if (!forceReAnalyze && extractedAddress) {
      const cachedAnalysis = await this.tryGetCachedAnalysis(extractedAddress, userId);
      
      // 캐시 히트: 기존 분석 재사용
      if (cachedAnalysis) {
        await this.markDocumentsAsVerified(documents);
        return this.copyAnalysisFromCache(estateId, cachedAnalysis);
      }
    }

    // 캐시 미스: 새로운 분석 수행
    return this.performNewAnalysis(estateId, documents, ocrText, documentData);
  }

  private async tryGetCachedAnalysis(address: string, userId: number): Promise<EstateAnalysisReport | null> {
    console.log(`[EstateAnalysisReport] 주소 기반 캐시 검색: ${address}`);
    const cached = await this.analysisCacheStrategyPort.findCachedAnalysis(address, userId);
    
    if (cached) {
      console.log(`[EstateAnalysisReport] 캐시 히트 (원본 ID: ${cached.id})`);
    }
    
    return cached;
  }

  private async markDocumentsAsVerified(documents: Document[]): Promise<void> {
    for (const document of documents) {
      document.isRealEstateDocument = true;
      document.documentValidatedAt = new Date();
    }
    await this.documentRepository.save(documents);
  }

  private async performNewAnalysis(
    estateId: number,
    documents: Document[],
    ocrText: string,
    documentData: Array<{ base64: string; buffer: Buffer; mimeType: string; name: string }>,
  ): Promise<EstateAnalysisReport> {
    // 1차 검증: 부동산 관련 파일 여부 판별 (Text LLM)
    console.log('[EstateAnalysisReport] 캐시 미스. 문서 판별 시작');
    await this.validateAndMarkDocuments(documents, ocrText);
    
    // 2차 분석: 부동산 분석 (Multimodal LLM)
    console.log('[EstateAnalysisReport] 2차 분석 시작 (Multimodal LLM)');
    return this.performAiAnalysis(estateId, documents, ocrText, documentData);
  }

  private async validateAndMarkDocuments(documents: Document[], ocrText: string): Promise<void> {
    try {
      await this.validateRealEstateDocument(ocrText);
      await this.markDocumentsAsVerified(documents);
    } catch (error) {
      await this.markDocumentsAsInvalid(documents);
      throw error;
    }
  }

  private async markDocumentsAsInvalid(documents: Document[]): Promise<void> {
    for (const document of documents) {
      document.isRealEstateDocument = false;
      document.documentValidatedAt = new Date();
    }
    await this.documentRepository.save(documents);
  }

  private async finalizeAnalysis(
    documentIds: number[],
    extractedAddress: string | null,
    analysisReport: EstateAnalysisReport,
    userId: number,
  ): Promise<void> {
    await this.deleteUnusedDocuments(documentIds);

    if (extractedAddress && analysisReport.estateId) {
      await this.analysisCacheStrategyPort.saveCachedAnalysis(extractedAddress, userId, analysisReport.estateId);
    }

    if (analysisReport.estateId) {
      await this.estateAnalysisReportCacheService.invalidate(analysisReport.estateId);
    }
  }

  /**
   * 부동산 문서 여부 판별 (Text LLM)
   */
  private async validateRealEstateDocument(ocrText: string): Promise<boolean> {
    // OCR 텍스트 길이 검증
    if (ocrText.length < 30) {
      throw new CustomException(ErrorCode.OCR_TEXT_TOO_SHORT);
    }

    // LLM 문서 판별 요청
    const userPrompt = buildDocumentValidationPrompt(ocrText);
    console.log('[EstateAnalysisReport] 문서 판별 시작 (Text LLM)');
    
    const validationResultText = await this.textGeneratorPort.generateText(
      DOCUMENT_VALIDATOR_SYSTEM_PROMPT,
      userPrompt,
    );

    // 결과 파싱
    const validationResult: DocumentValidationResultDto = ErrorHandler.parseJson(
      validationResultText,
      {
        isRealEstateDocument: false,
        confidence: 0,
        documentType: null,
        reason: '문서 판별 결과를 파싱할 수 없습니다.',
      },
    );

    console.log('[EstateAnalysisReport] 문서 판별 결과:', validationResult);

    // 신뢰도 검증
    if (validationResult.confidence < 0.6) {
      throw new CustomException(
        ErrorCode.DOCUMENT_VALIDATION_UNCERTAIN,
        `문서 유형을 명확히 판별할 수 없습니다. (신뢰도: ${validationResult.confidence.toFixed(2)}) 더 선명한 이미지를 업로드하거나, 부동산 관련 문서가 맞는지 확인해주세요.`,
      );
    }

    // 부동산 문서 여부 확인
    if (!validationResult.isRealEstateDocument) {      
      throw new CustomException(ErrorCode.NOT_REAL_ESTATE_DOCUMENT, '업로드하신 문서는 부동산 관련 문서가 아닙니다. 등기부등본, 건축물대장, 전세계약서 등을 업로드해주세요.');
    }

    console.log(
      `[EstateAnalysisReport] 문서 판별 성공: ${validationResult.documentType || '알 수 없음'} (신뢰도: ${validationResult.confidence.toFixed(2)})`,
    );
    
    return true;
  }

  /**
   * OCR 텍스트에서 주소 추출
   */
  private extractAddressFromOcrText(ocrText: string): string | null {
    if (!ocrText) {
      return null;
    }

    // 정규식 패턴 정의
    const addressPatterns = [
      /([가-힣]+[시도]\s+[가-힣]+[시군구]\s+[가-힣\s\d-]+)/g,
      /소재지[:\s]*([가-힣\s\d-]+)/g,
      /주소[:\s]*([가-힣\s\d-]+)/g,
    ];

    // 패턴 매칭 시도
    for (const pattern of addressPatterns) {
      const matches = ocrText.match(pattern);
      if (matches && matches.length > 0) {
        return matches[0].replace(/소재지[:\s]*|주소[:\s]*/, '').trim();
      }
    }

    return null;
  }

  /**
   * 캐시된 분석 결과 복사 (AI 호출 비용 절감)
   */
  private async copyAnalysisFromCache(
    estateId: number,
    cachedAnalysis: EstateAnalysisReport,
  ): Promise<EstateAnalysisReport> {
    // DTO 변환
    const cachedData = EstateAnalysisReportMapper.toCachedAnalysisDto(cachedAnalysis);
    const analysisReportData = EstateAnalysisReportMapper.fromCachedAnalysis(estateId, cachedData);
    
    // 엔티티 생성 및 저장
    const analysisReport = this.estateAnalysisReportRepository.create(analysisReportData);
    return this.estateAnalysisReportRepository.save(analysisReport);
  }

  /**
   * AI 기반 부동산 문서 분석 (Multimodal LLM)
   */
  private async performAiAnalysis(
    estateId: number,
    documents: Document[],
    ocrText: string,
    documentData: Array<{ base64: string; buffer: Buffer; mimeType: string; name: string }>,
  ): Promise<EstateAnalysisReport> {
    // 파일 버퍼 준비
    const fileBuffers: FileWithMimeType[] = documentData.map((data) => ({
      buffer: data.buffer,
      mimeType: data.mimeType,
    }));

    // 프롬프트 생성 및 AI 분석 요청
    const userPrompt = this.documentProcessingService.buildAnalysisPrompt(documents, ocrText);
    const analysisResult = await this.textGeneratorPort.generateTextFromImages(
      SYSTEM_PROMPT,
      userPrompt,
      fileBuffers,
    );

    // JSON 파싱 및 DTO 변환
    const parsedAnalysis: any = ErrorHandler.parseJson(analysisResult, {});
    const aiResult = EstateAnalysisReportMapper.toAiAnalysisResultDto(parsedAnalysis, estateId, analysisResult);
    const analysisReportData = EstateAnalysisReportMapper.fromAiAnalysisResult(estateId, aiResult);
    
    // 엔티티 생성 및 저장
    const analysisReport = this.estateAnalysisReportRepository.create(analysisReportData);

    console.log('[EstateAnalysisReport] AI 분석 완료:', {
      estateId: analysisReport.estateId,
      safetyScore: analysisReport.safetyScore,
    });

    return this.estateAnalysisReportRepository.save(analysisReport);
  }


  /**
   * 미사용 문서 삭제 (S3 및 DB)
   */
  private async deleteUnusedDocuments(usedDocumentIds: number[]): Promise<void> {
    try {
      // 연결되지 않은 문서 조회 및 필터링
      const unlinkedDocuments = await this.documentRepository.findUnlinked();
      const documentsToDelete = unlinkedDocuments.filter(
        (doc) => !usedDocumentIds.includes(doc.docId),
      );

      // S3 파일 삭제
      await ErrorHandler.handleBatchOperation(
        documentsToDelete,
        async (document) => {
          await this.s3Port.delete(document.s3Key);
        },
        'S3 파일 삭제',
      );

      // DB 레코드 삭제
      if (documentsToDelete.length > 0) {
        const docIdsToDelete = documentsToDelete.map((doc) => doc.docId);
        await this.documentRepository.delete(docIdsToDelete);
        console.log(`[EstateAnalysisReport] 미사용 문서 삭제 완료: ${docIdsToDelete.length}건`);
      }
    } catch (error) {
      console.error('[EstateAnalysisReport] 미사용 문서 삭제 실패:', error);
    }
  }

  async findByEstateId(estateId: number): Promise<EstateAnalysisReport | null> {
    return this.estateAnalysisReportRepository.findByEstateId(estateId);
  }

  /**
   * 분석 결과 조회 (캐시 우선)
   */
  async getAnalysisResult(estateId: number): Promise<EstateAnalysisReportResponseDto> {
    // Redis 캐시 조회
    const cached = await this.estateAnalysisReportCacheService.get(estateId);
    if (cached) {
      console.log(`[EstateAnalysisReport] 캐시 조회 성공: estateId=${estateId}`);
      return cached;
    }

    // DB 조회
    const analysisReport = await this.findByEstateId(estateId);
    if (!analysisReport) {
      console.log(`[EstateAnalysisReport] 분석 결과 없음: estateId=${estateId}`);
      return EstateAnalysisReportMapper.emptyResponse();
    }

    // DTO 변환 및 캐시 저장
    const responseDto = EstateAnalysisReportMapper.toResponseDto(analysisReport);
    await this.estateAnalysisReportCacheService.set(estateId, responseDto);

    return responseDto;
  }

  /**
   * 분석 리포트 목록 조회 (페이징, Redis 캐시)
   */
  async findAll(userId: number, query: SearchEstateAnalysisDto): Promise<PaginationResponseDto<EstateAnalysisReportResponseDto>> {
    // 캐시 키 생성
    const cacheKey = `estate-analysis-list:${userId}:page:${query.page || 1}:limit:${query.limit || 10}`;
    const cacheTTL = Duration.ofSeconds(60).seconds();

    // Redis 캐시 조회
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      console.log(`[EstateAnalysisReport] Redis 캐시 히트: ${cacheKey}`);
      return JSON.parse(cached);
    }

    // DB 조회 및 캐시 저장
    console.log(`[EstateAnalysisReport] Redis 캐시 미스: ${cacheKey}`);
    const result = await this.estateAnalysisReportRepository.findAll(userId, query);
    await this.redisService.set(cacheKey, JSON.stringify(result), cacheTTL);

    return result;
  }
}
