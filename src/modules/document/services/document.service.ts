import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
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

  /**
   * 문서를 매물에 연결하고 S3 파일을 이동합니다.
   * @param documentIds 문서 ID 목록
   * @param estateId 매물 ID
   */
  async attachDocumentsToEstate(
    documentIds: number[],
    estateId: number,
  ): Promise<void> {
    if (!documentIds || documentIds.length === 0) {
      return;
    }

    const documents = await this.documentRepository.find({
      where: { docId: In(documentIds) },
    });

    if (documents.length === 0) {
      return;
    }

    for (const document of documents) {
      document.estateId = estateId;

      // S3 키가 temp로 시작하면 estateId 폴더로 이동
      if (document.s3Key.startsWith('temp/')) {
        const fileName = document.s3Key.split('/').pop();
        const newKey = `${estateId}/${fileName}`;

        try {
          // S3에서 파일 복사
          await this.s3Port.copy(document.s3Key, newKey);

          // 이전 파일 삭제
          await this.s3Port.delete(document.s3Key);

          document.s3Key = newKey;
        } catch (error) {
          console.error(
            `Failed to move S3 file from ${document.s3Key} to ${newKey}:`,
            error,
          );
          // 파일 이동 실패 시에도 DB 업데이트는 진행할지 여부 결정 필요
          // 현재 로직에서는 에러 로그만 남기고 진행
        }
      }
    }

    await this.documentRepository.save(documents);
  }
}