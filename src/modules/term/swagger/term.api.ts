import { applyDecorators } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TermResponseDto } from '@/modules/term/dto/response/term-response.dto';

export const ApiTermController = () => applyDecorators(ApiTags('Terms'));

export const ApiGetTerms = () =>
  applyDecorators(
    ApiOperation({ summary: '모든 약관 목록 조회' }),
    ApiResponse({
      status: 200,
      description: '약관 목록 조회 성공',
      type: [TermResponseDto],
    }),
  );

export const ApiCreateTerm = () =>
  applyDecorators(
    ApiOperation({ summary: '약관 생성' }),
    ApiResponse({
      status: 201,
      description: '약관 생성 성공',
      type: TermResponseDto,
    }),
  );

export const ApiUpdateTerm = () =>
  applyDecorators(
    ApiOperation({ summary: '약관 수정' }),
    ApiResponse({
      status: 200,
      description: '약관 수정 성공',
      type: TermResponseDto,
    }),
  );
