import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '@/modules/document/entities/document.entity';
import { DocumentType } from '@/common/enums/document-type.enum';
import { S3Port } from '@/common/ports/s3.port';
import { v4 as uuidV4 } from 'uuid';
import { DocumentResponseDto } from '@/modules/document/dto/response/document-response.dto';


@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly s3Port: S3Port
  ) {}

  /**
   * 파일 업로드
   * @param file 업로드할 파일
   * @param docType 문서 타입
   */
  async uploadAndCreateDocument(
    file: Express.Multer.File,
    docType: DocumentType = DocumentType.REGISTRY,
  ): Promise<DocumentResponseDto> {
    // S3 키 생성을 위한 UUID 생성
    const fileUuid = uuidV4();
    const key = `temp/${fileUuid}-${file.originalname}`;

    // S3에 파일 업로드
    await this.s3Port.upload(file.buffer, key, file.mimetype);

    // 문서 엔티티 생성 및 저장 (estateId 없이)
    const newDocument = this.documentRepository.create({
      estateId: null,
      estate: null,
      docType,
      originalName: file.originalname,
      s3Key: key,
      contentType: file.mimetype,
    });

    const savedDocument = await this.documentRepository.save(newDocument);
    return new DocumentResponseDto(savedDocument);
  }
}