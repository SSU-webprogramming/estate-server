import { applyDecorators } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CreateEstateAnalysisDto } from '@/modules/estate-analysis-report/dto/req/estate-analysis-req.dto';
import { EstateAnalysisReportResponseDto } from '@/modules/estate-analysis-report/dto/res/estate-analysis-report-response.dto';

export const ApiEstateAnalysisReportController = () =>
  applyDecorators(ApiTags('분석'));

export const ApiAnalyzeEstate = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: '부동산 정보 및 문서 분석 요청',
      description: '부동산 정보와 문서 ID를 받아서 분석을 수행하고 결과를 저장합니다.',
    }),
    ApiBody({
      type: CreateEstateAnalysisDto,
      description: '부동산 정보 및 분석할 문서 ID 목록',
    }),
    ApiResponse({
      status: 201,
      description: '분석이 성공적으로 완료되었습니다.',
      type: EstateAnalysisReportResponseDto,
    }),
    ApiResponse({
      status: 400,
      description: '잘못된 요청 데이터입니다.',
    }),
    ApiResponse({
      status: 401,
      description: '인증이 필요합니다.',
    }),
  );

export const ApiGetAnalysisResult = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: '부동산 분석 결과 조회',
      description:
        '부동산 ID로 분석 결과를 조회합니다. 분석이 완료된 경우 결과를 반환하고, 아직 분석이 완료되지 않은 경우 빈 응답을 반환합니다.',
    }),
    ApiParam({
      name: 'estateId',
      description: '부동산 ID',
      type: Number,
      example: 1,
    }),
    ApiResponse({
      status: 200,
      description:
        '분석 결과 조회 성공. 분석이 완료된 경우 결과 데이터를 반환하고, 아직 분석이 완료되지 않은 경우 모든 필드가 null인 빈 응답을 반환합니다.',
      type: EstateAnalysisReportResponseDto,
      example: {
        id: 11,
        estateId: 11,
        analyzedAt: '2025-12-01T03:09:44.188Z',
        safetyScore: 100,
        address: '서울특별시 관악구 낙성대역6길 17-8',
        buildingStructure: '철근콘크리트조',
        buildingUsage: '단독(다중)주택, 근린생활시설',
        totalFloors: '지상 5층, 지하 1층, 옥탑 1층',
        totalLandArea: 215,
        exclusiveArea: null,
        landRightRatio: '전부',
        hasSeparateRegistration: false,
        isIllegalConstruction: null,
        ownershipStatus: 'CLEAR',
        currentOwner: '강환숙',
        transferDate: '2020-07-13',
        transferCause: '매매',
        pastOwnerChangeCount: 3,
        hasOwnershipRestriction: false,
        titleSectionAnalysisSummary:
          '건물 등기부와 토지 등기부의 주소, 소유자 정보가 모두 일치합니다. 건물은 철근콘크리트 구조의 다중주택 및 근린생활시설로, 토지는 건물 부지에 해당하는 \'대지\'로 정상적으로 등기되어 있어 표제부 상의 문제점은 발견되지 않았습니다.',
        titleSectionAnalysisResult: 'SAFE',
        ownershipSectionAnalysisSummary:
          '2020년 7월 13일 매매를 통해 현재 소유자 \'강환숙\'님이 토지와 건물의 소유권을 함께 취득했습니다. 소유권에 대한 압류, 가압류, 가처분 등 어떠한 제한 사항도 없어 소유권이 깨끗하고 안정적인 상태입니다.',
        ownershipSectionAnalysisResult: 'SAFE',
        rightsSectionAnalysisSummary:
          '을구(소유권 이외의 권리에 관한 사항)에 \'기록사항 없음\'으로 기재되어 있습니다. 이는 해당 부동산을 담보로 한 대출(근저당권), 전세권 설정 등 다른 권리가 전혀 없음을 의미하며, 권리관계가 매우 깨끗한 최상의 상태입니다.',
        rightsSectionAnalysisResult: 'SAFE',
        rightsAnalysisSummary:
          '본 부동산은 토지와 건물 소유자가 동일하며, 소유권을 제한하는 압류나 가압류가 전혀 없습니다. 또한, 은행 대출(근저당권)이나 타인의 권리(전세권 등)도 설정되어 있지 않아 권리관계가 매우 깨끗하고 안전합니다. 계약 시 발생할 수 있는 권리 관련 위험이 거의 없는 최상의 상태로 평가됩니다.',
        recommendedContractClauses: [
          '잔금 지급일 당일에 등기부등본을 다시 발급받아, 계약 시점과 동일하게 깨끗한 권리상태(근저당권 등 제한물권 없음)임을 확인한 후 잔금을 지급한다.',
          '본 계약은 임차인의 전입신고와 확정일자가 효력을 발생하는 익일 0시까지 현재의 등기부등본 상태를 그대로 유지하는 조건이다.',
        ],
        isInsuranceEligible: true,
        insuranceAnalysisReasons: [
          '소유권이 명확하고 제한 사항이 없음',
          '부동산을 담보로 한 채무(근저당권)가 없어 보증금 회수 위험이 매우 낮음',
          '토지와 건물의 소유자가 동일하여 권리관계가 안정적임',
        ],
        recommendedInsuranceCompanies: [
          'HUG주택도시보증공사',
          'SGI서울보증',
          'HF한국주택금융공사',
        ],
      },
    }),
    ApiResponse({
      status: 401,
      description: '인증이 필요합니다.',
    }),
    ApiResponse({
      status: 404,
      description: '해당 부동산을 찾을 수 없습니다.',
    }),
  );

import { PaginationResponseDto } from '@/common/dto/pagination-response.dto';

export const ApiSearchEstateAnalysis = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: '부동산 분석 리포트 목록 검색' }),
    ApiResponse({
      status: 200,
      description: '분석 리포트 목록 조회 성공',
      type: PaginationResponseDto,
    }),
    ApiResponse({
      status: 401,
      description: '인증이 필요합니다.',
    }),
  );