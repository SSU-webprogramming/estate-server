import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '@/modules/document/entities/document.entity';
import { DocumentType } from '@/common/enums/document-type.enum';
import { S3Port } from '@/common/ports/s3.port';
import { v4 as uuidV4 } from 'uuid';
import { DocumentResponseDto } from '@/modules/document/dto/response/document-response.dto';
import { DocumentInfoResponseDto } from '@/modules/document/dto/response/document-info-response.dto';
import { DocumentMapper } from '../mappers/document.mapper';


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
   * @param userId 업로더 사용자 ID
   */
  async uploadAndCreateDocument(
    file: Express.Multer.File,
    docType: DocumentType = DocumentType.REGISTRY,
    userId?: number,
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
      userId: userId || null,
      docType,
      originalName: file.originalname,
      s3Key: key,
      contentType: file.mimetype,
    });

    const savedDocument = await this.documentRepository.save(newDocument);
    return new DocumentResponseDto(savedDocument);
  }


  /**
   * 문서 조회
   * @param documentId 문서 ID
   */
  async getDocument(documentId: number): Promise<DocumentInfoResponseDto> {
    const document = await this.documentRepository.findOne({
      where: { docId: documentId },
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${documentId} not found`);
    }

    return DocumentMapper.toInfoDto(document);
  }

  /**
   * 사용자별 문서 목록 조회
   * @param userId 사용자 ID
   */
  async getUserDocuments(userId: number): Promise<DocumentInfoResponseDto[]> {
    const documents = await this.documentRepository.find({
      where: { userId },
      order: { uploadedAt: 'DESC' },
    });

    return documents.map((doc) => DocumentMapper.toInfoDto(doc));
  }
}