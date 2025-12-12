import { EstateAnalysisReport } from '@/modules/estate-analysis-report/entities/estate-analysis-report.entity';
import { EstateAnalysisReportResponseDto } from '@/modules/estate-analysis-report/dto/response/estate-analysis-report-response.dto';
import { CachedAnalysisDto } from '@/modules/estate-analysis-report/dto/cached-analysis.dto';
import { AiAnalysisResultDto } from '@/modules/estate-analysis-report/dto/ai-analysis-result.dto';
import { CreateEstateAnalysisDto } from '@/modules/estate-analysis-report/dto/request/estate-analysis-req.dto';
import { CreateEstateDto } from '@/modules/estate/dto/request/create-estate.dto';
import { AnalysisResultStatus } from '@/common/enums/analysis-result-status.enum';

/**
 * EstateAnalysisReport 엔티티 <-> DTO 매핑 전담 클래스
 */
export class EstateAnalysisReportMapper {
  /**
   * 분석 요청 DTO -> Estate 생성 DTO 변환
   * @param dto - 부동산 분석 요청 DTO
   * @returns Estate 생성 DTO
   */
  static toCreateEstateDto(dto: CreateEstateAnalysisDto): CreateEstateDto {
    const createEstateDto = new CreateEstateDto();
    createEstateDto.address = dto.address;
    createEstateDto.addressDetail = dto.addressDetail;
    createEstateDto.contractType = dto.contractType;
    createEstateDto.deposit = dto.deposit;
    createEstateDto.monthlyRent = dto.monthlyRent;
    createEstateDto.kbMarketPrice = dto.kbMarketPrice;
    return createEstateDto;
  }
  /**
   * 엔티티 -> 응답 DTO
   */
  static toResponseDto(
    report: EstateAnalysisReport,
  ): EstateAnalysisReportResponseDto {
    const dto = new EstateAnalysisReportResponseDto();

    dto.id = report.id;
    dto.estateId = report.estateId;
    dto.analyzedAt = report.analyzedAt;
    dto.safetyScore = report.safetyScore;
    dto.address = report.address;
    dto.buildingStructure = report.buildingStructure;
    dto.buildingUsage = report.buildingUsage;
    dto.totalFloors = report.totalFloors;
    dto.totalLandArea = report.totalLandArea;
    dto.exclusiveArea = report.exclusiveArea;
    dto.landRightRatio = report.landRightRatio;
    dto.hasSeparateRegistration = report.hasSeparateRegistration;
    dto.isIllegalConstruction = report.isIllegalConstruction;
    dto.ownershipStatus = report.ownershipStatus;
    dto.currentOwner = report.currentOwner;
    dto.transferDate = report.transferDate;
    dto.transferCause = report.transferCause;
    dto.pastOwnerChangeCount = report.pastOwnerChangeCount;
    dto.hasOwnershipRestriction = report.hasOwnershipRestriction;
    dto.titleSectionAnalysisSummary = report.titleSectionAnalysisSummary;
    dto.titleSectionAnalysisResult = report.titleSectionAnalysisResult;
    dto.ownershipSectionAnalysisSummary =
      report.ownershipSectionAnalysisSummary;
    dto.ownershipSectionAnalysisResult =
      report.ownershipSectionAnalysisResult;
    dto.rightsSectionAnalysisSummary = report.rightsSectionAnalysisSummary;
    dto.rightsSectionAnalysisResult = report.rightsSectionAnalysisResult;
    dto.rightsAnalysisSummary = report.rightsAnalysisSummary;
    dto.recommendedContractClauses = report.recommendedContractClauses;
    dto.isInsuranceEligible = report.isInsuranceEligible;
    dto.insuranceAnalysisReasons = report.insuranceAnalysisReasons;
    dto.recommendedInsuranceCompanies = report.recommendedInsuranceCompanies;

    return dto;
  }

  /**
   * 분석이 아직 완료되지 않은 경우에 사용하는 빈 응답 DTO
   */
  static emptyResponse(): EstateAnalysisReportResponseDto {
    const dto = new EstateAnalysisReportResponseDto();

    dto.id = null;
    dto.estateId = null;
    dto.analyzedAt = null;
    dto.safetyScore = null;
    dto.address = null;
    dto.buildingStructure = null;
    dto.buildingUsage = null;
    dto.totalFloors = null;
    dto.totalLandArea = null;
    dto.exclusiveArea = null;
    dto.landRightRatio = null;
    dto.hasSeparateRegistration = null;
    dto.isIllegalConstruction = null;
    dto.ownershipStatus = null;
    dto.currentOwner = null;
    dto.transferDate = null;
    dto.transferCause = null;
    dto.pastOwnerChangeCount = null;
    dto.hasOwnershipRestriction = null;
    dto.titleSectionAnalysisSummary = null;
    dto.titleSectionAnalysisResult = null;
    dto.ownershipSectionAnalysisSummary = null;
    dto.ownershipSectionAnalysisResult = null;
    dto.rightsSectionAnalysisSummary = null;
    dto.rightsSectionAnalysisResult = null;
    dto.rightsAnalysisSummary = null;
    dto.recommendedContractClauses = null;
    dto.isInsuranceEligible = null;
    dto.insuranceAnalysisReasons = null;
    dto.recommendedInsuranceCompanies = null;

    return dto;
  }

  /**
   * 엔티티 -> 캐시된 분석 DTO
   */
  static toCachedAnalysisDto(
    report: EstateAnalysisReport,
  ): CachedAnalysisDto {
    return {
      safetyScore: report.safetyScore,
      address: report.address,
      ownershipStatus: report.ownershipStatus,
      buildingStructure: report.buildingStructure,
      buildingUsage: report.buildingUsage,
      totalFloors: report.totalFloors,
      totalLandArea: report.totalLandArea,
      exclusiveArea: report.exclusiveArea,
      landRightRatio: report.landRightRatio,
      hasSeparateRegistration: report.hasSeparateRegistration,
      isIllegalConstruction: report.isIllegalConstruction,
      currentOwner: report.currentOwner,
      transferDate: report.transferDate,
      transferCause: report.transferCause,
      pastOwnerChangeCount: report.pastOwnerChangeCount,
      hasOwnershipRestriction: report.hasOwnershipRestriction,
      titleSectionAnalysisSummary: report.titleSectionAnalysisSummary,
      titleSectionAnalysisResult: report.titleSectionAnalysisResult,
      ownershipSectionAnalysisSummary: report.ownershipSectionAnalysisSummary,
      ownershipSectionAnalysisResult: report.ownershipSectionAnalysisResult,
      rightsSectionAnalysisSummary: report.rightsSectionAnalysisSummary,
      rightsSectionAnalysisResult: report.rightsSectionAnalysisResult,
      rightsAnalysisSummary: report.rightsAnalysisSummary,
      recommendedContractClauses: report.recommendedContractClauses,
      isInsuranceEligible: report.isInsuranceEligible,
      insuranceAnalysisReasons: report.insuranceAnalysisReasons,
      recommendedInsuranceCompanies: report.recommendedInsuranceCompanies,
    };
  }

  /**
   * 캐시된 분석 데이터 -> 엔티티
   * @param estateId - Estate ID (Entity가 아닌 ID만 전달하여 계층 분리 원칙 준수)
   */
  static fromCachedAnalysis(
    estateId: number,
    cachedData: CachedAnalysisDto,
  ): Partial<EstateAnalysisReport> {
    return {
      estateId: estateId,
      analyzedAt: new Date(),
      safetyScore: cachedData.safetyScore,
      address: cachedData.address ?? '',
      ownershipStatus: cachedData.ownershipStatus ?? 'UNKNOWN',
      buildingStructure: cachedData.buildingStructure,
      buildingUsage: cachedData.buildingUsage,
      totalFloors: cachedData.totalFloors,
      totalLandArea: cachedData.totalLandArea,
      exclusiveArea: cachedData.exclusiveArea,
      landRightRatio: cachedData.landRightRatio,
      hasSeparateRegistration: cachedData.hasSeparateRegistration,
      isIllegalConstruction: cachedData.isIllegalConstruction,
      currentOwner: cachedData.currentOwner,
      transferDate: cachedData.transferDate,
      transferCause: cachedData.transferCause,
      pastOwnerChangeCount: cachedData.pastOwnerChangeCount,
      hasOwnershipRestriction: cachedData.hasOwnershipRestriction,
      titleSectionAnalysisSummary: cachedData.titleSectionAnalysisSummary,
      titleSectionAnalysisResult: cachedData.titleSectionAnalysisResult,
      ownershipSectionAnalysisSummary: cachedData.ownershipSectionAnalysisSummary,
      ownershipSectionAnalysisResult: cachedData.ownershipSectionAnalysisResult,
      rightsSectionAnalysisSummary: cachedData.rightsSectionAnalysisSummary,
      rightsSectionAnalysisResult: cachedData.rightsSectionAnalysisResult,
      rightsAnalysisSummary: cachedData.rightsAnalysisSummary,
      recommendedContractClauses: cachedData.recommendedContractClauses,
      isInsuranceEligible: cachedData.isInsuranceEligible,
      insuranceAnalysisReasons: cachedData.insuranceAnalysisReasons,
      recommendedInsuranceCompanies: cachedData.recommendedInsuranceCompanies,
    };
  }

  /**
   * AI 분석 결과 -> 엔티티
   * @param estateId - Estate ID (Entity가 아닌 ID만 전달하여 계층 분리 원칙 준수)
   */
  static fromAiAnalysisResult(
    estateId: number,
    aiResult: AiAnalysisResultDto,
  ): Partial<EstateAnalysisReport> {
    return {
      estateId: estateId,
      analyzedAt: new Date(),
      safetyScore: aiResult.safetyScore,
      address: aiResult.address ?? '',
      ownershipStatus: aiResult.ownershipStatus ?? 'UNKNOWN',
      buildingStructure: aiResult.buildingStructure,
      buildingUsage: aiResult.buildingUsage,
      totalFloors: aiResult.totalFloors,
      totalLandArea: aiResult.totalLandArea,
      exclusiveArea: aiResult.exclusiveArea,
      landRightRatio: aiResult.landRightRatio,
      hasSeparateRegistration: aiResult.hasSeparateRegistration,
      isIllegalConstruction: aiResult.isIllegalConstruction,
      currentOwner: aiResult.currentOwner,
      transferDate: aiResult.transferDate,
      transferCause: aiResult.transferCause,
      pastOwnerChangeCount: aiResult.pastOwnerChangeCount,
      hasOwnershipRestriction: aiResult.hasOwnershipRestriction,
      titleSectionAnalysisSummary: aiResult.titleSectionAnalysisSummary,
      titleSectionAnalysisResult: aiResult.titleSectionAnalysisResult,
      ownershipSectionAnalysisSummary: aiResult.ownershipSectionAnalysisSummary,
      ownershipSectionAnalysisResult: aiResult.ownershipSectionAnalysisResult,
      rightsSectionAnalysisSummary: aiResult.rightsSectionAnalysisSummary,
      rightsSectionAnalysisResult: aiResult.rightsSectionAnalysisResult,
      rightsAnalysisSummary: aiResult.rightsAnalysisSummary,
      recommendedContractClauses: aiResult.recommendedContractClauses,
      isInsuranceEligible: aiResult.isInsuranceEligible,
      insuranceAnalysisReasons: aiResult.insuranceAnalysisReasons,
      recommendedInsuranceCompanies: aiResult.recommendedInsuranceCompanies,
    };
  }

  /**
   * AI 파싱 결과 -> AI 분석 결과 DTO
   */
  /**
   * AI 파싱 결과를 DTO로 변환
   * @param estateId - Estate ID (Entity가 아닌 ID만 전달)
   */
  static toAiAnalysisResultDto(
    parsedAnalysis: any,
    estateId: number,
    analysisResult: string,
  ): AiAnalysisResultDto {
    return {
      safetyScore: parsedAnalysis.safetyScore ?? null,
      address: parsedAnalysis.address || '',
      ownershipStatus: parsedAnalysis.ownershipStatus || 'UNKNOWN',
      buildingStructure: parsedAnalysis.buildingStructure || null,
      buildingUsage: parsedAnalysis.buildingUsage || null,
      totalFloors: parsedAnalysis.totalFloors ? String(parsedAnalysis.totalFloors) : null,
      totalLandArea: parsedAnalysis.totalLandArea || null,
      exclusiveArea: parsedAnalysis.exclusiveArea || null,
      landRightRatio: parsedAnalysis.landRightRatio ? String(parsedAnalysis.landRightRatio) : null,
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
    };
  }

  /**
   * 분석 결과 상태 문자열 파싱
   */
  private static parseAnalysisResultStatus(status: string | undefined): AnalysisResultStatus | null {
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
