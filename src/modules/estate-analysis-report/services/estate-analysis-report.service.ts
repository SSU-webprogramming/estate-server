import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { TextGeneratorPort, FileWithMimeType } from '@/modules/estate-analysis-report/ports/text-generator.port';
import { ANALYSIS_CACHE_STRATEGY_PORT } from '@/modules/estate-analysis-report/ports/analysis-cache-strategy.port';
import type { AnalysisCacheStrategyPort } from '@/modules/estate-analysis-report/ports/analysis-cache-strategy.port';
import { SYSTEM_PROMPT } from '@/modules/estate-analysis-report/prompts/system.prompt';
import { Estate } from '@/modules/estate/entities/estate.entity';
import { Document } from '@/modules/document/entities/document.entity';
import { EstateAnalysisReport } from '@/modules/estate-analysis-report/entities/estate-analysis-report.entity';
import { S3Port } from '@/common/ports/s3.port';
import { AnalysisResultStatus } from '@/common/enums/analysis-result-status.enum';
import { CreateEstateAnalysisDto } from '@/modules/estate-analysis-report/dto/request/estate-analysis-req.dto';
import { EstateAnalysisReportResponseDto } from '../dto/response/estate-analysis-report-response.dto';
import { EstateAnalysisReportMapper } from '../mapper/estate-analysis-report.mapper';
import { EstateAnalysisReportCacheService } from './estate-analysis-report-cache.service';
import { SearchEstateAnalysisDto } from '../dto/request/search-estate-analysis.dto';
import { SafetyScoreSearchType } from '../dto/request/safety-score-search-type.enum';
import { PaginationResponseDto, PaginationMetaDto } from '@/common/dto/pagination-response.dto';
import { CustomException } from '@/common/errors/custom-exception';
import { ErrorCode } from '@/common/errors/error';
import { DocumentProcessingService } from './document-processing.service';
@Injectable()
export class EstateAnalysisReportService {
  constructor(
    @InjectRepository(Estate)
    private readonly estateRepository: Repository<Estate>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(EstateAnalysisReport)
    private readonly analysisReportRepository: Repository<EstateAnalysisReport>,
    private readonly textGeneratorPort: TextGeneratorPort,
    private readonly s3Port: S3Port,
    private readonly estateAnalysisReportCacheService: EstateAnalysisReportCacheService,
    private readonly documentProcessingService: DocumentProcessingService,
    @Inject(ANALYSIS_CACHE_STRATEGY_PORT)
    private readonly analysisCacheStrategyPort: AnalysisCacheStrategyPort
  ) {}

  async analyzeEsate(fileBuffer: Buffer, mimeType: string): Promise<string> {
    const userPrompt = `다음 문서를 분석하세요.`;

    return this.textGeneratorPort.generateTextFromImage(
      SYSTEM_PROMPT,
      userPrompt,
      fileBuffer,
      mimeType,
    );
  }

  /**
   * 부동산 정보를 받아서 분석을 요청하는 메서드
   * 
   * 최적화 전략:
   * 1. OCR 후 주소 추출
   * 2. 주소 기반 캐시 검색 (forceReAnalyze가 false인 경우)
   * 3. 캐시 히트 시 기존 분석 복사, 미스 시 AI 분석 요청
   * 
   * @param userId 사용자 ID
   * @param createEstateAnalysisDto 부동산 정보 및 문서 ID 목록
   * @returns 생성된 분석 리포트
   */
  async analyzeEstateWithDocuments(
    userId: number,
    createEstateAnalysisDto: CreateEstateAnalysisDto,
  ): Promise<EstateAnalysisReportResponseDto> {
    // 1. Estate 엔티티 생성 및 저장
    const estate = this.estateRepository.create({
      userId,
      address: createEstateAnalysisDto.address ?? null,
      addressDetail: createEstateAnalysisDto.addressDetail ?? null,
      contractType: createEstateAnalysisDto.contractType ?? null,
      deposit: createEstateAnalysisDto.deposit ?? 0,
      monthlyRent: createEstateAnalysisDto.monthlyRent ?? 0,
      kbMarketPrice: createEstateAnalysisDto.kbMarketPrice ?? 0,
    });
    const savedEstate = await this.estateRepository.save(estate);

    // 2. Document 조회
    const documents = await this.documentRepository.find({
      where: { docId: In(createEstateAnalysisDto.documentIds) },
    });

    if (documents.length === 0) {
      throw new CustomException(ErrorCode.FILE_NOT_FOUND);
    }

    // 3. Document를 Estate에 연결
    for (const document of documents) {
      document.estateId = savedEstate.estateId;
      document.estate = savedEstate;
    }
    await this.documentRepository.save(documents);

    // 4. OCR 수행 및 extractedText 저장
    const { ocrText, documentData } = await this.documentProcessingService.processOcrAndExtractText(documents);

    // 5. OCR 결과에서 주소 추출 (AI 분석 전 캐시 체크를 위해)
    const extractedAddress = this.extractAddressFromOcrText(ocrText) || createEstateAnalysisDto.address;

    // 6. 캐시 전략을 통한 기존 분석 검색 (forceReAnalyze가 false인 경우)
    let cachedAnalysis: EstateAnalysisReport | null = null;
    const forceReAnalyze = createEstateAnalysisDto.forceReAnalyze ?? false;

    if (!forceReAnalyze && extractedAddress) {
      console.log(`[EstateAnalysisReport] 캐시 검색 시도: ${extractedAddress}`);
      cachedAnalysis = await this.analysisCacheStrategyPort.findCachedAnalysis(
        extractedAddress,
        userId,
      );
    }

    let analysisReport: EstateAnalysisReport;

    if (cachedAnalysis) {
      // 캐시 히트: 기존 분석 결과 복사
      console.log(`[EstateAnalysisReport] 캐시 히트! 기존 분석 재사용 (원본 ID: ${cachedAnalysis.id})`);
      analysisReport = await this.copyAnalysisFromCache(savedEstate, cachedAnalysis);
    } else {
      // 캐시 미스: AI 분석 요청
      console.log(`[EstateAnalysisReport] 캐시 미스. AI 분석 요청`);
      analysisReport = await this.performAiAnalysis(
        savedEstate,
        documents,
        ocrText,
        documentData,
      );
    }

    // 7. 사용되지 않은 Document 삭제 (임시파일)
    await this.deleteUnusedDocuments(createEstateAnalysisDto.documentIds);

    // 8. Redis 캐시에 저장 (새로 분석한 경우만)
    if (!cachedAnalysis && extractedAddress && analysisReport.estateId) {
      await this.analysisCacheStrategyPort.saveCachedAnalysis(
        extractedAddress,
        userId,
        analysisReport.estateId,
      );
    }

    // 9. 기존 캐시 무효화
    if (analysisReport.estateId) {
      await this.estateAnalysisReportCacheService.invalidate(analysisReport.estateId);
    }

    return EstateAnalysisReportMapper.toResponseDto(analysisReport);
  }

  /**
   * OCR 텍스트에서 주소를 추출합니다
   * 
   * @param ocrText OCR 텍스트
   * @returns 추출된 주소 또는 null
   */
  private extractAddressFromOcrText(ocrText: string): string | null {
    if (!ocrText) {
      return null;
    }

    // 주소 패턴 매칭 (간단한 정규식)
    // 예: "서울특별시", "경기도", "부산광역시" 등으로 시작하는 주소
    const addressPatterns = [
      /([가-힣]+[시도]\s+[가-힣]+[시군구]\s+[가-힣\s\d-]+)/g,
      /소재지[:\s]*([가-힣\s\d-]+)/g,
      /주소[:\s]*([가-힣\s\d-]+)/g,
    ];

    for (const pattern of addressPatterns) {
      const matches = ocrText.match(pattern);
      if (matches && matches.length > 0) {
        // 첫 번째 매칭된 주소 반환
        return matches[0].replace(/소재지[:\s]*|주소[:\s]*/, '').trim();
      }
    }

    return null;
  }

  /**
   * 캐시된 분석 결과를 새 Estate에 복사합니다
   * 
   * @param estate 새로 생성된 Estate
   * @param cachedAnalysis 캐시된 분석 결과
   * @returns 복사된 분석 리포트
   */
  private async copyAnalysisFromCache(
    estate: Estate,
    cachedAnalysis: EstateAnalysisReport,
  ): Promise<EstateAnalysisReport> {
    const analysisReport = this.analysisReportRepository.create({
      estateId: estate.estateId,
      estate: estate,
      analyzedAt: new Date(),
      // 캐시된 분석 결과 복사
      safetyScore: cachedAnalysis.safetyScore,
      address: cachedAnalysis.address,
      ownershipStatus: cachedAnalysis.ownershipStatus,
      buildingStructure: cachedAnalysis.buildingStructure,
      buildingUsage: cachedAnalysis.buildingUsage,
      totalFloors: cachedAnalysis.totalFloors,
      totalLandArea: cachedAnalysis.totalLandArea,
      exclusiveArea: cachedAnalysis.exclusiveArea,
      landRightRatio: cachedAnalysis.landRightRatio,
      hasSeparateRegistration: cachedAnalysis.hasSeparateRegistration,
      isIllegalConstruction: cachedAnalysis.isIllegalConstruction,
      currentOwner: cachedAnalysis.currentOwner,
      transferDate: cachedAnalysis.transferDate,
      transferCause: cachedAnalysis.transferCause,
      pastOwnerChangeCount: cachedAnalysis.pastOwnerChangeCount,
      hasOwnershipRestriction: cachedAnalysis.hasOwnershipRestriction,
      titleSectionAnalysisSummary: cachedAnalysis.titleSectionAnalysisSummary,
      titleSectionAnalysisResult: cachedAnalysis.titleSectionAnalysisResult,
      ownershipSectionAnalysisSummary: cachedAnalysis.ownershipSectionAnalysisSummary,
      ownershipSectionAnalysisResult: cachedAnalysis.ownershipSectionAnalysisResult,
      rightsSectionAnalysisSummary: cachedAnalysis.rightsSectionAnalysisSummary,
      rightsSectionAnalysisResult: cachedAnalysis.rightsSectionAnalysisResult,
      rightsAnalysisSummary: cachedAnalysis.rightsAnalysisSummary,
      recommendedContractClauses: cachedAnalysis.recommendedContractClauses,
      isInsuranceEligible: cachedAnalysis.isInsuranceEligible,
      insuranceAnalysisReasons: cachedAnalysis.insuranceAnalysisReasons,
      recommendedInsuranceCompanies: cachedAnalysis.recommendedInsuranceCompanies,
    });

    return await this.analysisReportRepository.save(analysisReport);
  }

  /**
   * AI를 통해 새로운 분석을 수행합니다
   * 
   * @param estate Estate 엔티티
   * @param documents 문서 목록
   * @param ocrText OCR 텍스트
   * @param documentData 문서 데이터
   * @returns 분석 리포트
   */
  private async performAiAnalysis(
    estate: Estate,
    documents: Document[],
    ocrText: string,
    documentData: Array<{ base64: string; buffer: Buffer; mimeType: string; name: string }>,
  ): Promise<EstateAnalysisReport> {
    // AI 분석 요청
    const fileBuffers: FileWithMimeType[] = documentData.map((data) => ({
      buffer: data.buffer,
      mimeType: data.mimeType,
    }));
    const userPrompt = this.documentProcessingService.buildAnalysisPrompt(documents, ocrText);
    const analysisResult = await this.textGeneratorPort.generateTextFromImages(
      SYSTEM_PROMPT,
      userPrompt,
      fileBuffers,
    );

    // AI 분석 결과 파싱
    let parsedAnalysis: any = {};
    try {
      parsedAnalysis = JSON.parse(analysisResult);
    } catch (error) {
      console.error('Failed to parse analysis result as JSON:', error);
      // JSON 파싱 실패 시 기본값 사용
    }

    // EstateAnalysisReport 생성 및 저장
    const analysisReport = this.analysisReportRepository.create({
      estateId: estate.estateId,
      estate: estate,
      analyzedAt: new Date(),
      safetyScore: parsedAnalysis.safetyScore ?? null,
      address: parsedAnalysis.address || estate.address || '',
      ownershipStatus: parsedAnalysis.ownershipStatus || 'UNKNOWN',
      buildingStructure: parsedAnalysis.buildingStructure || null,
      buildingUsage: parsedAnalysis.buildingUsage || null,
      totalFloors: parsedAnalysis.totalFloors || null,
      totalLandArea: parsedAnalysis.totalLandArea || null,
      exclusiveArea: parsedAnalysis.exclusiveArea || null,
      landRightRatio: parsedAnalysis.landRightRatio || null,
      hasSeparateRegistration: parsedAnalysis.hasSeparateRegistration ?? null,
      isIllegalConstruction: parsedAnalysis.isIllegalConstruction ?? null,
      currentOwner: parsedAnalysis.currentOwner || null,
      transferDate: parsedAnalysis.transferDate 
        ? new Date(parsedAnalysis.transferDate) 
        : null,
      transferCause: parsedAnalysis.transferCause || null,
      pastOwnerChangeCount: parsedAnalysis.pastOwnerChangeCount || null,
      hasOwnershipRestriction: parsedAnalysis.hasOwnershipRestriction ?? null,
      titleSectionAnalysisSummary: parsedAnalysis.titleSectionAnalysisSummary || null,
      titleSectionAnalysisResult: this.parseAnalysisResultStatus(parsedAnalysis.titleSectionAnalysisResult),
      ownershipSectionAnalysisSummary: parsedAnalysis.ownershipSectionAnalysisSummary || null,
      ownershipSectionAnalysisResult: this.parseAnalysisResultStatus(parsedAnalysis.ownershipSectionAnalysisResult),
      rightsSectionAnalysisSummary: parsedAnalysis.rightsSectionAnalysisSummary || null,
      rightsSectionAnalysisResult: this.parseAnalysisResultStatus(parsedAnalysis.rightsSectionAnalysisResult),
      rightsAnalysisSummary: parsedAnalysis.rightsAnalysisSummary || analysisResult,
      recommendedContractClauses: parsedAnalysis.recommendedContractClauses || null,
      isInsuranceEligible: parsedAnalysis.isInsuranceEligible ?? null,
      insuranceAnalysisReasons: parsedAnalysis.insuranceAnalysisReasons || null,
      recommendedInsuranceCompanies: parsedAnalysis.recommendedInsuranceCompanies || null,
    });

    console.log('analysisReport', analysisReport);
    return await this.analysisReportRepository.save(analysisReport);
  }


  /**
   * 사용되지 않은 Document 삭제 (임시파일)
   */
  private async deleteUnusedDocuments(usedDocumentIds: number[]): Promise<void> {
    // estateId가 null인 모든 문서 조회
    const unlinkedDocuments = await this.documentRepository.find({
      where: { estateId: IsNull() },
    });

    // 사용되지 않은 문서 필터링
    const documentsToDelete = unlinkedDocuments.filter(
      (doc) => !usedDocumentIds.includes(doc.docId),
    );

    // S3에서 파일 삭제
    for (const document of documentsToDelete) {
      try {
        await this.s3Port.delete(document.s3Key);
      } catch (error) {
        console.error(`Failed to delete S3 file ${document.s3Key}:`, error);
      }
    }

    // DB에서 문서 삭제
    if (documentsToDelete.length > 0) {
      const docIdsToDelete = documentsToDelete.map((doc) => doc.docId);
      await this.documentRepository.delete({
        docId: In(docIdsToDelete),
      });
    }
  }

  /**
   * 부동산 ID로 분석 리포트 조회
   * @param estateId 부동산 ID
   * @returns 분석 리포트 또는 null (분석이 완료되지 않은 경우)
   */
  async findByEstateId(
    estateId: number,
  ): Promise<EstateAnalysisReport | null> {
    return await this.analysisReportRepository.findOne({
      where: { estateId },
    });
  }

  async getAnalysisResult(estateId: number): Promise<EstateAnalysisReportResponseDto> {
    const cached = await this.estateAnalysisReportCacheService.get(estateId);
    if (cached) {
      return cached;
    }

    const analysisReport = await this.findByEstateId(estateId);

    if (!analysisReport) {
      return EstateAnalysisReportMapper.emptyResponse();
    }

    const responseDto = EstateAnalysisReportMapper.toResponseDto(analysisReport);
    await this.estateAnalysisReportCacheService.set(estateId, responseDto);

    return responseDto;
  }

  /**
   * 분석 리포트 목록 검색
   * @param query 검색 조건 (안전 점수, 주소)
   * @returns 분석 리포트 목록
   */
  async findAll(userId: number, query: SearchEstateAnalysisDto): Promise<PaginationResponseDto<EstateAnalysisReportResponseDto>> {
    const qb = this.analysisReportRepository
      .createQueryBuilder('report');

    // Join with Estate to filter by userId
    qb.innerJoin('report.estate', 'estate');
    qb.where('estate.userId = :userId', { userId });

    if (query.address) {
      qb.andWhere('report.address LIKE :address', { address: `%${query.address}%` });
    }

    if (query.safetyScore) {
      if (query.safetyScore === SafetyScoreSearchType.SAFE) {
        qb.andWhere('report.safetyScore >= :minScore', { minScore: 80 });
      } else if (query.safetyScore === SafetyScoreSearchType.CAUTION) {
        qb.andWhere('report.safetyScore >= :minScore AND report.safetyScore < :maxScore', {
          minScore: 60,
          maxScore: 80,
        });
      } else if (query.safetyScore === SafetyScoreSearchType.DANGER) {
        qb.andWhere('report.safetyScore < :maxScore', { maxScore: 60 });
      }
    }

    // 기본 정렬: 최신순
    qb.orderBy('report.analyzedAt', 'DESC');

    // Pagination
    qb.skip(query.skip).take(query.limit);

    const [reports, total] = await qb.getManyAndCount();

    const data = reports.map((report) => EstateAnalysisReportMapper.toResponseDto(report));
    const meta = new PaginationMetaDto(query.page, query.limit, total);

    return new PaginationResponseDto(data, meta);
  }

  /**
   * 분석 결과 상태 문자열을 enum으로 변환
   * @param status 분석 결과 상태 문자열 (SAFE, CAUTION, DANGER, UNKNOWN)
   * @returns AnalysisResultStatus enum 값 또는 null
   */
  private parseAnalysisResultStatus(status: string | undefined): AnalysisResultStatus | null {
    if (!status) {
      return null;
    }
    
    const upperStatus = status.toUpperCase();
    
    // enum 값으로 직접 매칭
    if (upperStatus === 'SAFE') {
      return AnalysisResultStatus.SAFE;
    }
    if (upperStatus === 'CAUTION') {
      return AnalysisResultStatus.CAUTION;
    }
    if (upperStatus === 'DANGER') {
      return AnalysisResultStatus.DANGER;
    }
    if (upperStatus === 'UNKNOWN') {
      return AnalysisResultStatus.UNKNOWN;
    }
    
    return null;
  }
}
