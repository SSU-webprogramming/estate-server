import { Document } from '@/modules/document/entities/document.entity';
import { DocumentResponseDto } from '@/modules/document/dto/response/document-response.dto';
import { DocumentInfoResponseDto } from '@/modules/document/dto/response/document-info-response.dto';

export class DocumentMapper {
  static toResponseDto(document: Document): DocumentResponseDto {
    return new DocumentResponseDto(document);
  }

  static toInfoDto(document: Document): DocumentInfoResponseDto {
    return new DocumentInfoResponseDto(document);
  }
}
