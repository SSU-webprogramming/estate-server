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
import { DocumentType } from '../entities/document.entity';
import { DocumentResponseDto } from '../dto/res/document-response.dto';

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
      name: 'docType',
      type: String,
      description: '문서 타입 (1: 등기부등본, 2: 토지대장)',
      required: false,
      enum: DocumentType,
    }),
    ApiResponse({
      status: 201,
      description: '문서 업로드 성공',
      type: DocumentResponseDto,
    }),
  );

