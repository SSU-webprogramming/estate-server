import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Estate } from '../../estate/entities/estate.entity';
import { AnalysisResultStatus } from './analysis-result-status.enum';

/**
 * 부동산 분석 리포트 엔티티
 * 부동산 문서 분석 결과를 관리
 */
@Entity('estate_analysis_report')
export class EstateAnalysisReport {
  /** 분석 리포트 ID (PK) */
  @PrimaryGeneratedColumn({ 
    name: 'id', 
    type: 'bigint',
    comment: '분석 리포트 ID (PK)'
  })
  id: number;

  /** 소속 부동산 ID (FK) */
  @Column({ 
    name: 'estate_id', 
    type: 'bigint', 
    nullable: true,
    comment: '소속 부동산 ID (FK)'
  })
  estateId: number | null;

  /** 소속 부동산 정보 */
  @OneToOne(() => Estate, (estate) => estate.analysisResult, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'estate_id' })
  estate: Estate | null;

  /** 분석 일시 */
  @Column({ 
    name: 'analyzed_at', 
    type: 'timestamp', 
    default: () => 'CURRENT_TIMESTAMP', 
    nullable: true,
    comment: '분석 일시'
  })
  analyzedAt: Date | null;

  /** 안전 점수 */
  @Column({ 
    name: 'safety_score', 
    type: 'int', 
    nullable: true,
    comment: '안전 점수 (100점 만점)'
  })
  safetyScore: number | null;

  /** 주소 */
  @Column({ 
    name: 'address', 
    type: 'varchar', 
    length: 255, 
    comment: '주소' 
  })
  address: string;

  /** 건물 구조 */
  @Column({ 
    name: 'building_structure', 
    type: 'varchar', 
    length: 100, 
    nullable: true, 
    comment: '건물 구조' 
  })
  buildingStructure: string | null;

  /** 건물 용도 */
  @Column({ 
    name: 'building_usage', 
    type: 'varchar', 
    length: 100, 
    nullable: true, 
    comment: '건물 용도' 
  })
  buildingUsage: string | null;

  /** 총 층수 */
  @Column({ 
    name: 'total_floors', 
    type: 'varchar', 
    length: 50, 
    nullable: true,
    comment: '총 층수'
  })
  totalFloors: string | null;

  /** 총 토지 면적 */
  @Column({ 
    name: 'total_land_area', 
    type: 'double precision', 
    nullable: true,
    comment: '총 토지 면적'
  })
  totalLandArea: number | null;

  /** 전용 면적 */
  @Column({ 
    name: 'exclusive_area', 
    type: 'double precision', 
    nullable: true,
    comment: '전용 면적'
  })
  exclusiveArea: number | null;

  /** 지분 비율 */
  @Column({ 
    name: 'land_right_ratio', 
    type: 'varchar', 
    length: 50, 
    nullable: true,
    comment: '지분 비율'
  })
  landRightRatio: string | null;

  /** 분리 등기 여부 */
  @Column({ 
    name: 'has_separate_registration', 
    type: 'boolean', 
    default: false, 
    nullable: true,
    comment: '분리 등기 여부'
  })
  hasSeparateRegistration: boolean | null;

  /** 불법 건축물 여부 */
  @Column({ 
    name: 'is_illegal_construction', 
    type: 'boolean', 
    default: false, 
    nullable: true,
    comment: '불법 건축물 여부'
  })
  isIllegalConstruction: boolean | null;

  /** 소유권 상태 */
  @Column({ 
    name: 'ownership_status', 
    type: 'varchar', 
    length: 20,
    comment: '소유권 상태'
  })
  ownershipStatus: string;

  /** 현재 소유자 */
  @Column({ 
    name: 'current_owner', 
    type: 'varchar', 
    length: 100, 
    nullable: true,
    comment: '현재 소유자'
  })
  currentOwner: string | null;

  /** 양도일 */
  @Column({ 
    name: 'transfer_date', 
    type: 'date', 
    nullable: true,
    comment: '양도일'
  })
  transferDate: Date | null;

  /** 양도 사유 */
  @Column({ 
    name: 'transfer_cause', 
    type: 'varchar', 
    length: 100, 
    nullable: true,
    comment: '양도 사유'
  })
  transferCause: string | null;

  /** 과거 소유자 변경 횟수 */
  @Column({ 
    name: 'past_owner_change_count', 
    type: 'bigint', 
    nullable: true,
    comment: '과거 소유자 변경 횟수'
  })
  pastOwnerChangeCount: number | null;

  /** 소유권 제한 여부 */
  @Column({ 
    name: 'has_ownership_restriction', 
    type: 'boolean', 
    default: false, 
    nullable: true,
    comment: '소유권 제한 여부'
  })
  hasOwnershipRestriction: boolean | null;

  /** 표제부 분석 요약 */
  @Column({ 
    name: 'title_section_analysis_summary', 
    type: 'text', 
    nullable: true,
    comment: '표제부 분석 요약'
  })
  titleSectionAnalysisSummary: string | null;

  /** 표제부 분석 결과 */
  @Column({ 
    name: 'title_section_analysis_result', 
    type: 'varchar', 
    length: 20,
    nullable: true,
    enum: AnalysisResultStatus,
    comment: '표제부 분석 결과 (안전, 주의, 위험, 확인 불가)'
  })
  titleSectionAnalysisResult: AnalysisResultStatus | null;

  /** 갑구(소유권) 분석 요약 */
  @Column({ 
    name: 'ownership_section_analysis_summary', 
    type: 'text', 
    nullable: true,
    comment: '갑구(소유권) 분석 요약'
  })
  ownershipSectionAnalysisSummary: string | null;

  /** 갑구(소유권) 분석 결과 */
  @Column({ 
    name: 'ownership_section_analysis_result', 
    type: 'varchar', 
    length: 20,
    nullable: true,
    enum: AnalysisResultStatus,
    comment: '갑구(소유권) 분석 결과 (안전, 주의, 위험, 확인 불가)'
  })
  ownershipSectionAnalysisResult: AnalysisResultStatus | null;

  /** 을구(소유권 외 권리) 분석 요약 */
  @Column({ 
    name: 'rights_section_analysis_summary', 
    type: 'text', 
    nullable: true,
    comment: '을구(소유권 외 권리) 분석 요약'
  })
  rightsSectionAnalysisSummary: string | null;

  /** 을구(소유권 외 권리) 분석 결과 */
  @Column({ 
    name: 'rights_section_analysis_result', 
    type: 'varchar', 
    length: 20,
    nullable: true,
    enum: AnalysisResultStatus,
    comment: '을구(소유권 외 권리) 분석 결과 (안전, 주의, 위험, 확인 불가)'
  })
  rightsSectionAnalysisResult: AnalysisResultStatus | null;

  /** 권리 분석 요약 */
  @Column({ 
    name: 'rights_analysis_summary', 
    type: 'text', 
    nullable: true,
    comment: '권리 분석 요약'
  })
  rightsAnalysisSummary: string | null;

  /** 권장 계약 조항 */
  @Column({ 
    name: 'recommended_contract_clauses', 
    type: 'jsonb', 
    nullable: true,
    comment: '권장 계약 조항'
  })
  recommendedContractClauses: any | null;

  /** 보험 가입 가능 여부 */
  @Column({ 
    name: 'is_insurance_eligible', 
    type: 'boolean', 
    nullable: true,
    comment: '보험 가입 가능 여부'
  })
  isInsuranceEligible: boolean | null;

  /** 보험 분석 사유 */
  @Column({ 
    name: 'insurance_analysis_reasons', 
    type: 'jsonb', 
    nullable: true,
    comment: '보험 분석 사유'
  })
  insuranceAnalysisReasons: any | null;

  /** 권장 보험사 */
  @Column({ 
    name: 'recommended_insurance_companies', 
    type: 'jsonb', 
    nullable: true,
    comment: '권장 보험사'
  })
  recommendedInsuranceCompanies: any | null;
}