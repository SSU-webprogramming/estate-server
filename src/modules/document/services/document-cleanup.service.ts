import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Document } from '@/modules/document/entities/document.entity';
import { DocumentRepository } from '@/modules/document/repositories/document.repository';
import { S3Port } from '@/common/ports/s3.port';
import { ErrorHandler } from '@/common/utils/error-handler.util';

@Injectable()
export class DocumentCleanupService {
  private readonly logger = new Logger(DocumentCleanupService.name);

  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly s3Port: S3Port,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupUnlinkedDocuments(): Promise<void> {
    this.logger.log('연결되지 않은 문서 정리 작업 시작');

    try {
      const unlinkedDocuments = await this.findUnlinkedDocuments();

      if (unlinkedDocuments.length === 0) {
        this.logger.log('연결되지 않은 문서 없음');
        return;
      }

      await this.deleteS3Files(unlinkedDocuments);
      await this.deleteDocumentRecords();

      this.logger.log('문서 정리 작업 완료');
    } catch (error) {
      this.logger.error('문서 정리 작업 중 오류 발생:', error);
    }
  }

  private async findUnlinkedDocuments(): Promise<Document[]> {
    return this.documentRepository.findUnlinked();
  }

  private async deleteS3Files(documents: Document[]): Promise<void> {
    this.logger.log(`${documents.length}개의 연결되지 않은 문서 발견`);

    const { successCount, failureCount } = await ErrorHandler.handleBatchOperation(
      documents,
      async (document) => {
        await this.s3Port.delete(document.s3Key);
        this.logger.debug(`S3 파일 삭제: ${document.s3Key}`);
      },
      'S3 파일 삭제',
      this.logger,
    );

    this.logger.log(`S3 파일 삭제 결과: 성공 ${successCount}개, 실패 ${failureCount}개`);
  }

  private async deleteDocumentRecords(): Promise<void> {
    const deleteResult = await this.documentRepository.deleteUnlinked();
    this.logger.log(`DB 레코드 삭제: ${deleteResult.affected || 0}개`);
  }
}

