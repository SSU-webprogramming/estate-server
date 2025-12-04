import { ApiProperty } from '@nestjs/swagger';
import { DocumentType } from '@/common/enums/document-type.enum';
import { Document } from '@/modules/document/entities/document.entity';

/**
 * 문서 응답 DTO
 */
export class DocumentResponseDto {
  @ApiProperty({
    description: '문서 ID',
    example: 1,
  })
  documentId: number;

  @ApiProperty({
    description: '문서 유형 (1: 등기부등본, 2: 토지대장)',
    enum: DocumentType,
    example: DocumentType.REGISTRY,
  })
  documentType: DocumentType;


  constructor(document: Document) {
    this.documentId = document.docId;
    this.documentType = document.docType;
  }
}

