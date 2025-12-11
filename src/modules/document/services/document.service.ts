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
    const fileUuid = uuidV4();
    const key = `temp/${fileUuid}-${file.originalname}`;

    await this.s3Port.upload(file.buffer, key, file.mimetype);

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


  async getDocument(documentId: number): Promise<DocumentInfoResponseDto> {
    const document = await this.documentRepository.findOne(documentId);

    if (!document) {
      throw new CustomException(ErrorCode.FILE_NOT_FOUND);
    }

    return DocumentMapper.toInfoDto(document);
  }

  async getUserDocuments(userId: number): Promise<DocumentInfoResponseDto[]> {
    const documents = await this.documentRepository.findByUserId(userId);

    return documents.map((doc) => DocumentMapper.toInfoDto(doc));
  }

  async attachDocumentsToEstate(
    documentIds: number[],
    estateId: number,
  ): Promise<void> {
    if (!documentIds || documentIds.length === 0) {
      return;
    }

    const documents = await this.documentRepository.findByIds(documentIds);

    if (documents.length === 0) {
      return;
    }

    for (const document of documents) {
      document.estateId = estateId;

      if (document.s3Key.startsWith('temp/')) {
        const fileName = document.s3Key.split('/').pop();
        const newKey = `${estateId}/${fileName}`;

        try {
          await this.s3Port.copy(document.s3Key, newKey);

          await this.s3Port.delete(document.s3Key);

          document.s3Key = newKey;
        } catch (error) {
          console.error(
            `Failed to move S3 file from ${document.s3Key} to ${newKey}:`,
            error,
          );
        }
      }
    }

    await this.documentRepository.save(documents);
  }
}