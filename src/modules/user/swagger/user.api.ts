import { applyDecorators } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserResponseDto } from '@/modules/user/dto/response/user-response.dto';
import { UpdateUserDto } from '@/modules/user/dto/request/update-user.dto';

export const ApiUserController = () => applyDecorators(ApiTags('사용자'));

export const ApiFindAllUsers = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: '모든 사용자 조회' }),
    ApiResponse({
      status: 200,
      description: '모든 사용자를 반환합니다.',
      type: [UserResponseDto],
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

