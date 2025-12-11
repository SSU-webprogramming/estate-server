import { Document } from '@/modules/document/entities/document.entity';
import { DocumentResponseDto } from '@/modules/document/dto/response/document-response.dto';
import { DocumentInfoResponseDto } from '@/modules/document/dto/response/document-info-response.dto';

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
}
