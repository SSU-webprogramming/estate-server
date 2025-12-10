import { applyDecorators } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UserResponseDto } from '@/modules/user/dto/response/user-response.dto';
import { UpdateUserDto } from '@/modules/user/dto/request/update-user.dto';
import { DeleteUsersDto } from '@/modules/user/dto/request/delete-users.dto';
import { PaginationResponseDto } from '@/common/dto/pagination-response.dto';
import { AgreeTermsRequestDto } from '@/modules/user/dto/request/agree-term.dto';
import { AgreeTermsResponseDto } from '@/modules/user/dto/response/agree-terms-response.dto';

export const ApiUserController = () => applyDecorators(ApiTags('사용자'));

export const ApiFindAllUsers = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: '모든 사용자 조회',
      description: '모든 사용자의 정보를 페이징하여 조회합니다.',
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
    ApiQuery({
      name: 'name',
      required: false,
      description: '이름 검색',
      type: String,
    }),
    ApiQuery({
      name: 'email',
      required: false,
      description: '이메일 검색',
      type: String,
    }),
    ApiResponse({
      status: 200,
      description: '모든 사용자 정보 조회 성공',
      type: PaginationResponseDto,
    }),
  );

export const ApiFindOneUser = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'ID로 사용자 조회' }),
    ApiResponse({
      status: 200,
      description: '단일 사용자를 반환합니다.',
      type: UserResponseDto,
    }),
    ApiResponse({ status: 404, description: '사용자를 찾을 수 없습니다.' }),
  );

export const ApiUpdateUser = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'ID로 사용자 업데이트' }),
    ApiResponse({
      status: 200,
      description: '사용자가 성공적으로 업데이트되었습니다.',
      type: UserResponseDto,
    }),
    ApiResponse({ status: 404, description: '사용자를 찾을 수 없습니다.' }),
    ApiBody({ type: UpdateUserDto }),
  );

export const ApiDeleteUser = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'ID로 사용자 삭제' }),
    ApiResponse({
      status: 204,
      description: '사용자가 성공적으로 삭제되었습니다.',
    }),
    ApiResponse({ status: 404, description: '사용자를 찾을 수 없습니다.' }),
    ApiResponse({ status: 404, description: '사용자를 찾을 수 없습니다.' }),
  );

export const ApiDeleteUsers = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: '사용자 목록 삭제 (Admin only)' }),
    ApiResponse({
      status: 200,
      description: '사용자들이 성공적으로 삭제되었습니다.',
    }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          userIds: {
            type: 'array',
            items: { type: 'number' },
            example: [1, 2, 3],
          },
        },
      },
    }),
  );

export const ApiAgreeTerms = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: '약관 동의',
      description: '사용자의 약관 동의를 저장합니다. 필수 약관에 모두 동의해야 합니다.',
    }),
    ApiBody({
      type: AgreeTermsRequestDto,
      description: '약관 동의 요청',
    }),
    ApiResponse({
      status: 200,
      description: '약관 동의 성공',
      type: AgreeTermsResponseDto,
    }),
    ApiResponse({
      status: 400,
      description: '잘못된 요청 (필수 약관 미동의, 잘못된 형식 등)',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 400 },
          errorCode: { type: 'string', example: 'AUTH006' },
          message: { type: 'string', example: '필수 약관에 동의해야 합니다.' },
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: '인증 실패',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 401 },
          errorCode: { type: 'string', example: 'AUTH005' },
          message: { type: 'string', example: '유효하지 않은 토큰입니다.' },
        },
      },
    }),
    ApiResponse({
      status: 404,
      description: '사용자를 찾을 수 없음',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 404 },
          errorCode: { type: 'string', example: 'U001' },
          message: { type: 'string', example: '사용자를 찾을 수 없습니다.' },
        },
      },
    }),
    ApiResponse({
      status: 409,
      description: '이미 약관에 동의한 사용자',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 409 },
          errorCode: { type: 'string', example: 'AUTH009' },
          message: { type: 'string', example: '이미 약관 동의가 완료된 사용자입니다.' },
        },
      },
    }),
    ApiResponse({
      status: 500,
      description: '서버 내부 오류',
      schema: {
        type: 'object',
        properties: {
          statusCode: { type: 'number', example: 500 },
          errorCode: { type: 'string', example: 'D001' },
          message: { type: 'string', example: '데이터베이스 연동 중 오류가 발생했습니다.' },
        },
      },
    }),
  );

