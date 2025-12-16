import { Document } from '@/modules/document/entities/document.entity';
import { DocumentResponseDto } from '@/modules/document/dto/response/document-response.dto';
import { DocumentInfoResponseDto } from '@/modules/document/dto/response/document-info-response.dto';
import { DocumentType } from '@/common/enums/document-type.enum';

export class DocumentMapper {

  static toResponseDto(document: Document): DocumentResponseDto {
    return new DocumentResponseDto(document);
  }

  static toResponseDtoList(documents: Document[]): DocumentResponseDto[] {
    return documents.map((document) => this.toResponseDto(document));
  }

  static toInfoDto(document: Document): DocumentInfoResponseDto {
    return new DocumentInfoResponseDto(document);
  }

  static toInfoDtoList(documents: Document[]): DocumentInfoResponseDto[] {
    return documents.map((document) => this.toInfoDto(document));
  }

  static fromUploadedFile(
    file: Express.Multer.File,
    s3Key: string,
    docType: DocumentType,
    userId?: number,
  ): Partial<Document> {
    return {
      estateId: null,
      estate: null,
      userId: userId || null,
      docType,
      originalName: file.originalname,
      s3Key,
      contentType: file.mimetype,
    };
  }
}
