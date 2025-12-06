import { applyDecorators } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CreateEstateDto } from '@/modules/estate/dto/request/create-estate.dto';
import { EstateResponseDto } from '@/modules/estate/dto/response/estate-response.dto';
import { PaginationResponseDto } from '@/common/dto/pagination-response.dto';

export const ApiEstateController = () => applyDecorators(ApiTags('부동산'));

export const ApiCreateEstate = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: '부동산 정보 등록',
      description: '현재 로그인한 사용자와 연관된 부동산 정보를 등록합니다.',
    }),
    ApiBody({
      type: CreateEstateDto,
      description: '등록할 부동산 정보',
    }),
    ApiResponse({
      status: 201,
      description: '부동산 정보가 성공적으로 등록되었습니다.',
      type: EstateResponseDto,
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

export const ApiGetEstateList = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: '부동산 목록 조회',
      description: '부동산 목록을 페이징하여 조회합니다.',
    }),
    ApiQuery({
      name: 'page',
      required: false,
      description: '페이지 번호 (기본값: 1)',
      type: Number,
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      description: '페이지당 항목 수 (기본값: 10)',
      type: Number,
    }),
    ApiResponse({
      status: 200,
      description: '부동산 목록 조회 성공',
      type: PaginationResponseDto,
    }),
    ApiResponse({
      status: 401,
      description: '인증이 필요합니다.',
    }),
    ApiResponse({
      status: 403,
      description: '권한이 없습니다.',
    }),
  );

