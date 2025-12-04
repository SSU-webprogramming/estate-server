import { EstateAnalysisReport } from '@/modules/estate-analysis-report/entities/estate-analysis-report.entity';
import { EstateAnalysisReportResponseDto } from '@/modules/estate-analysis-report/dto/res/estate-analysis-report-response.dto';

/**
 * EstateAnalysisReport 엔티티 <-> DTO 매핑 전담 클래스
 */
export class EstateAnalysisReportMapper {
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
}


