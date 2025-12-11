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

  async analyzeEstateWithDocuments(
    userId: number,
    createEstateAnalysisDto: CreateEstateAnalysisDto,
  ): Promise<EstateAnalysisReportResponseDto> {
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

    const documents = await this.documentRepository.find({
      where: { docId: In(createEstateAnalysisDto.documentIds) },
    });

    if (documents.length === 0) {
      throw new CustomException(ErrorCode.FILE_NOT_FOUND);
    }

    for (const document of documents) {
      document.estateId = savedEstate.estateId;
      document.estate = savedEstate;
    }
    await this.documentRepository.save(documents);

    const { ocrText, documentData } = await this.documentProcessingService.processOcrAndExtractText(documents);

    const extractedAddress = this.extractAddressFromOcrText(ocrText) || createEstateAnalysisDto.address;

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
      console.log(`[EstateAnalysisReport] 캐시 히트! 기존 분석 재사용 (원본 ID: ${cachedAnalysis.id})`);
      analysisReport = await this.copyAnalysisFromCache(savedEstate, cachedAnalysis);
    } else {
      console.log(`[EstateAnalysisReport] 캐시 미스. AI 분석 요청`);
      analysisReport = await this.performAiAnalysis(
        savedEstate,
        documents,
        ocrText,
        documentData,
      );
    }

    await this.deleteUnusedDocuments(createEstateAnalysisDto.documentIds);

    if (!cachedAnalysis && extractedAddress && analysisReport.estateId) {
      await this.analysisCacheStrategyPort.saveCachedAnalysis(
        extractedAddress,
        userId,
        analysisReport.estateId,
      );
    }

    if (analysisReport.estateId) {
      await this.estateAnalysisReportCacheService.invalidate(analysisReport.estateId);
    }

    return EstateAnalysisReportMapper.toResponseDto(analysisReport);
  }

  private extractAddressFromOcrText(ocrText: string): string | null {
    if (!ocrText) {
      return null;
    }

    const addressPatterns = [
      /([가-힣]+[시도]\s+[가-힣]+[시군구]\s+[가-힣\s\d-]+)/g,
      /소재지[:\s]*([가-힣\s\d-]+)/g,
      /주소[:\s]*([가-힣\s\d-]+)/g,
    ];

    for (const pattern of addressPatterns) {
      const matches = ocrText.match(pattern);
      if (matches && matches.length > 0) {
        return matches[0].replace(/소재지[:\s]*|주소[:\s]*/, '').trim();
      }
    }

    return null;
  }

  private async copyAnalysisFromCache(
    estate: Estate,
    cachedAnalysis: EstateAnalysisReport,
  ): Promise<EstateAnalysisReport> {
    const analysisReport = this.analysisReportRepository.create({
      estateId: estate.estateId,
      estate: estate,
      analyzedAt: new Date(),
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

  private async performAiAnalysis(
    estate: Estate,
    documents: Document[],
    ocrText: string,
    documentData: Array<{ base64: string; buffer: Buffer; mimeType: string; name: string }>,
  ): Promise<EstateAnalysisReport> {
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

    let parsedAnalysis: any = {};
    try {
      parsedAnalysis = JSON.parse(analysisResult);
    } catch (error) {
      console.error('Failed to parse analysis result as JSON:', error);
    }

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


  private async deleteUnusedDocuments(usedDocumentIds: number[]): Promise<void> {
    const unlinkedDocuments = await this.documentRepository.find({
      where: { estateId: IsNull() },
    });

    const documentsToDelete = unlinkedDocuments.filter(
      (doc) => !usedDocumentIds.includes(doc.docId),
    );

    for (const document of documentsToDelete) {
      try {
        await this.s3Port.delete(document.s3Key);
      } catch (error) {
        console.error(`Failed to delete S3 file ${document.s3Key}:`, error);
      }
    }

    if (documentsToDelete.length > 0) {
      const docIdsToDelete = documentsToDelete.map((doc) => doc.docId);
      await this.documentRepository.delete({
        docId: In(docIdsToDelete),
      });
    }
  }

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

  async findAll(userId: number, query: SearchEstateAnalysisDto): Promise<PaginationResponseDto<EstateAnalysisReportResponseDto>> {
    const qb = this.analysisReportRepository
      .createQueryBuilder('report');

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

    qb.orderBy('report.analyzedAt', 'DESC');

    qb.skip(query.skip).take(query.limit);

    const [reports, total] = await qb.getManyAndCount();

    const data = reports.map((report) => EstateAnalysisReportMapper.toResponseDto(report));
    const meta = new PaginationMetaDto(query.page, query.limit, total);

    return new PaginationResponseDto(data, meta);
  }

  private parseAnalysisResultStatus(status: string | undefined): AnalysisResultStatus | null {
    if (!status) {
      return null;
    }
    
    const upperStatus = status.toUpperCase();
    
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
