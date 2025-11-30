import { ApiProperty } from '@nestjs/swagger';

/**
 * 부동산 분석 리포트 응답 DTO
 */
export class EstateAnalysisReportResponseDto {
  @ApiProperty({
    description: '분석 리포트 ID',
    example: 1,
    nullable: true,
  })
  id: number | null;

  @ApiProperty({
    description: '소속 부동산 ID',
    example: 1,
    nullable: true,
  })
  estateId: number | null;

  @ApiProperty({
    description: '분석 일시',
    example: '2024-01-01T00:00:00.000Z',
    nullable: true,
  })
  analyzedAt: Date | null;

  @ApiProperty({
    description: '안전 점수 (100점 만점)',
    example: 85,
    nullable: true,
  })
  safetyScore: number | null;

  @ApiProperty({
    description: '주소',
    example: '서울특별시 강남구 테헤란로 123',
    nullable: true,
  })
  address: string | null;

  @ApiProperty({
    description: '건물 구조',
    example: '철근콘크리트조',
    nullable: true,
  })
  buildingStructure: string | null;

  @ApiProperty({
    description: '건물 용도',
    example: '공동주택',
    nullable: true,
  })
  buildingUsage: string | null;

  @ApiProperty({
    description: '총 층수',
    example: '15층',
    nullable: true,
  })
  totalFloors: string | null;

  @ApiProperty({
    description: '총 토지 면적 (㎡)',
    example: 500.5,
    nullable: true,
  })
  totalLandArea: number | null;

  @ApiProperty({
    description: '전용 면적 (㎡)',
    example: 84.5,
    nullable: true,
  })
  exclusiveArea: number | null;

  @ApiProperty({
    description: '지분 비율',
    example: '100%',
    nullable: true,
  })
  landRightRatio: string | null;

  @ApiProperty({
    description: '분리 등기 여부',
    example: false,
    nullable: true,
  })
  hasSeparateRegistration: boolean | null;

  @ApiProperty({
    description: '불법 건축물 여부',
    example: false,
    nullable: true,
  })
  isIllegalConstruction: boolean | null;

  @ApiProperty({
    description: '소유권 상태',
    example: '정상',
    nullable: true,
  })
  ownershipStatus: string | null;

  @ApiProperty({
    description: '현재 소유자',
    example: '홍길동',
    nullable: true,
  })
  currentOwner: string | null;

  @ApiProperty({
    description: '양도일',
    example: '2023-12-01',
    nullable: true,
  })
  transferDate: Date | null;

  @ApiProperty({
    description: '양도 사유',
    example: '매매',
    nullable: true,
  })
  transferCause: string | null;

  @ApiProperty({
    description: '과거 소유자 변경 횟수',
    example: 3,
    nullable: true,
  })
  pastOwnerChangeCount: number | null;

  @ApiProperty({
    description: '소유권 제한 여부',
    example: false,
    nullable: true,
  })
  hasOwnershipRestriction: boolean | null;

  @ApiProperty({
    description: '권리 분석 요약',
    example: '등기부등본 분석 결과, 소유권 변동 이력이 확인되었습니다...',
    nullable: true,
  })
  rightsAnalysisSummary: string | null;

  @ApiProperty({
    description: '권장 계약 조항',
    example: [
      {
        항목: '전세보증금 반환 조건',
        내용: '계약 만료 시 전세보증금을 즉시 반환하도록 명시',
      },
    ],
    nullable: true,
  })
  recommendedContractClauses: any | null;

  @ApiProperty({
    description: '보험 가입 가능 여부',
    example: true,
    nullable: true,
  })
  isInsuranceEligible: boolean | null;

  @ApiProperty({
    description: '보험 분석 사유',
    example: ['소유권 상태 정상', '근저당권 설정 없음'],
    nullable: true,
  })
  insuranceAnalysisReasons: any | null;

  @ApiProperty({
    description: '권장 보험사',
    example: ['KB손해보험', '삼성화재'],
    nullable: true,
  })
  recommendedInsuranceCompanies: any | null;
}
