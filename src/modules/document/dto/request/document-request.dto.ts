import { IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DocumentType } from 'src/common/enums/document-type.enum';

/**
 * 문서 업로드 요청 DTO
 */
export class UploadDocumentDto {
  @ApiProperty({
    name: 'documentType',
    description: '문서 유형 (1: 등기부등본, 2: 토지대장)',
    enum: DocumentType,
    example: DocumentType.REGISTRY,
    required: false,
  })
  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;
}

