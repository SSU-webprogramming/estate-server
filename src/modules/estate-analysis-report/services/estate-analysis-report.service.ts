import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { TextGeneratorPort, FileWithMimeType } from '@/modules/estate-analysis-report/ports/text-generator.port';
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


    // 5. 사용되지 않은 Document 삭제 (임시파일)
    await this.deleteUnusedDocuments(createEstateAnalysisDto.documentIds);
    // 6. AI 분석 요청
    const fileBuffers: FileWithMimeType[] = documentData.map((data) => ({
      buffer: data.buffer,
      mimeType: data.mimeType,
    }));
    const userPrompt = this.documentProcessingService.buildAnalysisPrompt(documents, ocrText);
    const analysisResult = await this.textGeneratorPort.generateTextFromImages(
      SYSTEM_PROMPT,
      userPrompt,
      fileBuffers
    );    
    // 7. AI 분석 결과 파싱
    let parsedAnalysis: any = {};
    try {
      parsedAnalysis = JSON.parse(analysisResult);
    } catch (error) {
      console.error('Failed to parse analysis result as JSON:', error);
      // JSON 파싱 실패 시 기본값 사용
    }

    // 8. EstateAnalysisReport 저장
    const analysisReport = this.analysisReportRepository.create({
      estateId: savedEstate.estateId,
      estate: savedEstate,
      analyzedAt: new Date(),
      safetyScore: parsedAnalysis.safetyScore ?? null,
      address: parsedAnalysis.address || savedEstate.address || '',
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
    const savedReport = await this.analysisReportRepository.save(analysisReport);

    if (savedReport.estateId) {
      await this.estateAnalysisReportCacheService.invalidate(savedReport.estateId);
    }

    return EstateAnalysisReportMapper.toResponseDto(savedReport);
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
