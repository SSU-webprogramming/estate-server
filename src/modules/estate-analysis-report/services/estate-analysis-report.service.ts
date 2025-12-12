import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TextGeneratorPort, FileWithMimeType } from '@/modules/estate-analysis-report/ports/text-generator.port';
import { ANALYSIS_CACHE_STRATEGY_PORT } from '@/modules/estate-analysis-report/ports/analysis-cache-strategy.port';
import type { AnalysisCacheStrategyPort } from '@/modules/estate-analysis-report/ports/analysis-cache-strategy.port';
import { SYSTEM_PROMPT } from '@/modules/estate-analysis-report/prompts/system.prompt';
import { Estate } from '@/modules/estate/entities/estate.entity';
import { Document } from '@/modules/document/entities/document.entity';
import { EstateService } from '@/modules/estate/services/estate.service';
import { EstateAnalysisReport } from '@/modules/estate-analysis-report/entities/estate-analysis-report.entity';
import { S3Port } from '@/common/ports/s3.port';
import { CreateEstateAnalysisDto } from '@/modules/estate-analysis-report/dto/request/estate-analysis-req.dto';
import { CreateEstateDto } from '@/modules/estate/dto/request/create-estate.dto';
import { EstateAnalysisReportResponseDto } from '../dto/response/estate-analysis-report-response.dto';
import { EstateAnalysisReportMapper } from '../mapper/estate-analysis-report.mapper';
import { CachedAnalysisDto } from '../dto/cached-analysis.dto';
import { AiAnalysisResultDto } from '../dto/ai-analysis-result.dto';
import { EstateAnalysisReportCacheService } from './estate-analysis-report-cache.service';
import { SearchEstateAnalysisDto } from '../dto/request/search-estate-analysis.dto';
import { PaginationResponseDto } from '@/common/dto/pagination-response.dto';
import { CustomException } from '@/common/errors/custom-exception';
import { ErrorCode } from '@/common/errors/error';
import { DocumentProcessingService } from './document-processing.service';
import { ErrorHandler } from '@/common/utils/error-handler.util';
import { EstateAnalysisReportRepository } from '../repositories/estate-analysis-report.repository';
import { DocumentRepository } from '@/modules/document/repositories/document.repository';
@Injectable()
export class EstateAnalysisReportService {
  constructor(
    @InjectRepository(Estate)
    private readonly estateRepository: Repository<Estate>,
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
    const createEstateDto = new CreateEstateDto();
    createEstateDto.address = createEstateAnalysisDto.address;
    createEstateDto.addressDetail = createEstateAnalysisDto.addressDetail;
    createEstateDto.contractType = createEstateAnalysisDto.contractType;
    createEstateDto.deposit = createEstateAnalysisDto.deposit;
    createEstateDto.monthlyRent = createEstateAnalysisDto.monthlyRent;
    createEstateDto.kbMarketPrice = createEstateAnalysisDto.kbMarketPrice;

    const savedEstate = await this.estateService.createEstateEntity(userId, createEstateDto);

    const documents = await this.documentRepository.findByIds(createEstateAnalysisDto.documentIds);

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
    const cachedData = EstateAnalysisReportMapper.toCachedAnalysisDto(cachedAnalysis);
    const analysisReportData = EstateAnalysisReportMapper.fromCachedAnalysis(estate, cachedData);
    const analysisReport = this.estateAnalysisReportRepository.create(analysisReportData);

    return await this.estateAnalysisReportRepository.save(analysisReport);
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

    const parsedAnalysis: any = ErrorHandler.parseJson(analysisResult, {});

    const aiResult = EstateAnalysisReportMapper.toAiAnalysisResultDto(parsedAnalysis, estate, analysisResult);
    const analysisReportData = EstateAnalysisReportMapper.fromAiAnalysisResult(estate, aiResult);
    const analysisReport = this.estateAnalysisReportRepository.create(analysisReportData);

    console.log('analysisReport', analysisReport);
    return await this.estateAnalysisReportRepository.save(analysisReport);
  }


  private async deleteUnusedDocuments(usedDocumentIds: number[]): Promise<void> {
    const unlinkedDocuments = await this.documentRepository.findUnlinked();

    const documentsToDelete = unlinkedDocuments.filter(
      (doc) => !usedDocumentIds.includes(doc.docId),
    );

    await ErrorHandler.handleBatchOperation(
      documentsToDelete,
      async (document) => {
        await this.s3Port.delete(document.s3Key);
      },
      'S3 파일 삭제',
    );

    if (documentsToDelete.length > 0) {
      const docIdsToDelete = documentsToDelete.map((doc) => doc.docId);
      await this.documentRepository.delete(docIdsToDelete);
    }
  }

  async findByEstateId(
    estateId: number,
  ): Promise<EstateAnalysisReport | null> {
    return await this.estateAnalysisReportRepository.findByEstateId(estateId);
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
    return await this.estateAnalysisReportRepository.findAll(userId, query);
  }
}
