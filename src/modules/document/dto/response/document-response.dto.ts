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
  docId: number;

  @ApiProperty({
    description: '문서 타입 (1: 등기부등본, 2: 토지대장)',
    enum: DocumentType,
    example: DocumentType.REGISTRY,
  })
  docType: DocumentType;


  constructor(document: Document) {
    this.docId = document.docId;
    this.docType = document.docType;
  }
}

