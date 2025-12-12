import { AnalysisResultStatus } from '@/common/enums/analysis-result-status.enum';

/**
 * 캐시된 분석 결과를 위한 DTO
 */
export class CachedAnalysisDto {
  safetyScore: number | null;
  address: string | null;
  ownershipStatus: string | null;
  buildingStructure: string | null;
  buildingUsage: string | null;
  totalFloors: string | null;
  totalLandArea: number | null;
  exclusiveArea: number | null;
  landRightRatio: string | null;
  hasSeparateRegistration: boolean | null;
  isIllegalConstruction: boolean | null;
  currentOwner: string | null;
  transferDate: Date | null;
  transferCause: string | null;
  pastOwnerChangeCount: number | null;
  hasOwnershipRestriction: boolean | null;
  titleSectionAnalysisSummary: string | null;
  titleSectionAnalysisResult: AnalysisResultStatus | null;
  ownershipSectionAnalysisSummary: string | null;
  ownershipSectionAnalysisResult: AnalysisResultStatus | null;
  rightsSectionAnalysisSummary: string | null;
  rightsSectionAnalysisResult: AnalysisResultStatus | null;
  rightsAnalysisSummary: string | null;
  recommendedContractClauses: any | null;
  isInsuranceEligible: boolean | null;
  insuranceAnalysisReasons: any | null;
  recommendedInsuranceCompanies: any | null;
}
