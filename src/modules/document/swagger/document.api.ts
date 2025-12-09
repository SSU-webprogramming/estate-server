import { applyDecorators } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { DocumentType } from '@/common/enums/document-type.enum';
import { DocumentResponseDto } from '@/modules/document/dto/response/document-response.dto';
import { DocumentInfoResponseDto } from '@/modules/document/dto/response/document-info-response.dto';

export const ApiDocumentController = () => applyDecorators(ApiTags('문서'));

export const ApiUploadDocument = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: '문서 업로드 (추후 분석용)' }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          file: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    }),
    ApiQuery({
      name: 'documentType',
      type: String,
      description: '문서 유형 (1: 등기부등본, 2: 토지대장)',
      required: false,
      enum: DocumentType,
    }),
    ApiResponse({
      status: 201,
      description: '문서 업로드 성공',
      type: DocumentResponseDto,
    }),
  );

export const ApiGetDocument = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: '문서 상세 조회' }),
    ApiResponse({
      status: 200,
      description: '문서 상세 조회 성공',
      type: DocumentInfoResponseDto,
    }),
    ApiResponse({
      status: 404,
      description: '문서를 찾을 수 없음',
    }),
  );

export const ApiGetDocuments = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: '사용자 문서 목록 조회' }),
    ApiResponse({
      status: 200,
      description: '사용자 문서 목록 조회 성공',
      type: [DocumentInfoResponseDto],
    }),
  );

