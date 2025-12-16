import { Injectable } from '@nestjs/common';
import { Document } from '@/modules/document/entities/document.entity';
import { DocumentType } from '@/common/enums/document-type.enum';
import { S3Port } from '@/common/ports/s3.port';
import { v4 as uuidV4 } from 'uuid';
import { DocumentResponseDto } from '@/modules/document/dto/response/document-response.dto';
import { DocumentInfoResponseDto } from '@/modules/document/dto/response/document-info-response.dto';
import { DocumentMapper } from '../mappers/document.mapper';
import { DocumentRepository } from '@/modules/document/repositories/document.repository';
import { CustomException } from '@/common/errors/custom-exception';
import { ErrorCode } from '@/common/errors/error';

@Injectable()
export class DocumentService {
  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly s3Port: S3Port
  ) {}

  async uploadAndCreateDocument(
    file: Express.Multer.File,
    docType: DocumentType = DocumentType.REGISTRY,
    userId?: number,
  ): Promise<DocumentResponseDto> {
    const s3Key = await this.uploadFileToS3(file);
    const savedDocument = await this.createDocumentRecord(file, s3Key, docType, userId);
    
    return DocumentMapper.toResponseDto(savedDocument);
  }

  private async uploadFileToS3(file: Express.Multer.File): Promise<string> {
    const fileUuid = uuidV4();
    const key = `temp/${fileUuid}-${file.originalname}`;
    
    await this.s3Port.upload(file.buffer, key, file.mimetype);
    return key;
  }

  private async createDocumentRecord(
    file: Express.Multer.File,
    s3Key: string,
    docType: DocumentType,
    userId?: number,
  ): Promise<Document> {
    // Step 1: Mapper를 통해 Document 엔티티 데이터 생성
    const documentData = DocumentMapper.fromUploadedFile(file, s3Key, docType, userId);
    
    // Step 2: Repository를 통해 엔티티 인스턴스 생성
    const newDocument = this.documentRepository.create(documentData);

    // Step 3: DB에 저장 후 반환
    return this.documentRepository.save(newDocument);
  }


  async getDocument(documentId: number): Promise<DocumentInfoResponseDto> {
    const document = await this.documentRepository.findOne(documentId);

    if (!document) {
      throw new CustomException(ErrorCode.FILE_NOT_FOUND);
    }

    return DocumentMapper.toInfoDto(document);
  }

  async getUserDocuments(userId: number): Promise<DocumentInfoResponseDto[]> {
    const documents = await this.documentRepository.findByUserId(userId);

    return DocumentMapper.toInfoDtoList(documents);
  }

  async attachDocumentsToEstate(documentIds: number[], estateId: number): Promise<void> {
    if (!documentIds || documentIds.length === 0) {
      return;
    }

    const documents = await this.documentRepository.findByIds(documentIds);
    
    for (const document of documents) {
      await this.attachDocumentToEstate(document, estateId);
    }

    await this.documentRepository.save(documents);
  }

  private async attachDocumentToEstate(document: Document, estateId: number): Promise<void> {
    document.estateId = estateId;

    if (this.isTemporaryFile(document.s3Key)) {
      await this.moveTempFileToPermanent(document, estateId);
    }
  }

  private isTemporaryFile(s3Key: string): boolean {
    return s3Key.startsWith('temp/');
  }

  private async moveTempFileToPermanent(document: Document, estateId: number): Promise<void> {
    const fileName = document.s3Key.split('/').pop();
    const newKey = `${estateId}/${fileName}`;

    try {
      await this.s3Port.copy(document.s3Key, newKey);
      await this.s3Port.delete(document.s3Key);
      document.s3Key = newKey;
    } catch (error) {
      console.error(`S3 파일 이동 실패 (${document.s3Key} -> ${newKey}):`, error);
    }
  }
}