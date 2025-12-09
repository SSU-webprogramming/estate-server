import { ApiProperty } from '@nestjs/swagger';
import { DocumentType } from '@/common/enums/document-type.enum';
import { Document } from '@/modules/document/entities/document.entity';

/**
 * 문서 상세 정보 DTO
 */
export class DocumentInfoResponseDto {
  @ApiProperty({
    description: '문서 ID',
    example: 1,
  })
  docId: number;

  @ApiProperty({
    description: '소속 부동산 ID',
    example: 1,
    nullable: true,
  })
  estateId: number | null;

  @ApiProperty({
    description: '문서 타입 (1: 등기부등본, 2: 토지대장)',
    enum: DocumentType,
    example: DocumentType.REGISTRY,
  })
  docType: DocumentType;

  @ApiProperty({
    description: '문서 파일명',
    example: '등기부등본.pdf',
  })
  originalName: string;

  @ApiProperty({
    description: 'S3 저장 키',
    example: 'documents/1234-5678.pdf',
  })
  s3Key: string;

  @ApiProperty({
    description: '파일 URL',
    example: 'https://s3.aws.com/bucket/documents/1234-5678.pdf',
    nullable: true,
  })
  fileUrl: string | null;

  @ApiProperty({
    description: '파일 MIME 타입',
    example: 'application/pdf',
    nullable: true,
  })
  contentType: string | null;

  @ApiProperty({
    description: '문서 순서',
    example: 0,
  })
  sortOrder: number;

  @ApiProperty({
    description: 'OCR로 추출한 텍스트',
    example: '추출된 텍스트 내용...',
    nullable: true,
  })
  extractedText: string | null;

  @ApiProperty({
    description: '업로드 일시',
    example: '2023-01-01T00:00:00.000Z',
  })
  uploadedAt: Date;

  constructor(document: Document) {
    this.docId = document.docId;
    this.estateId = document.estateId;
    this.docType = document.docType;
    this.originalName = document.originalName;
    this.s3Key = document.s3Key;
    this.fileUrl = document.fileUrl;
    this.contentType = document.contentType;
    this.sortOrder = document.sortOrder;
    this.extractedText = document.extractedText;
    this.uploadedAt = document.uploadedAt;
  }
}
