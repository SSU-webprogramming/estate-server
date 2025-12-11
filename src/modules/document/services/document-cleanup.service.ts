import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Document } from '@/modules/document/entities/document.entity';
import { S3Port } from '@/common/ports/s3.port';

@Injectable()
export class DocumentCleanupService {
  private readonly logger = new Logger(DocumentCleanupService.name);

  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly s3Port: S3Port,
  ) {}

  /**
   * 1시간마다 실행되는 배치 작업
   * estate와 연결되지 않은 문서들을 삭제합니다.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupUnlinkedDocuments(): Promise<void> {
    this.logger.log('Starting cleanup of unlinked documents...');

    try {
      const unlinkedDocuments = await this.documentRepository.find({
        where: { estateId: IsNull() },
      });

      if (unlinkedDocuments.length === 0) {
        this.logger.log('No unlinked documents found.');
        return;
      }

      this.logger.log(`Found ${unlinkedDocuments.length} unlinked documents to delete.`);

      for (const document of unlinkedDocuments) {
        try {
          await this.s3Port.delete(document.s3Key);
          this.logger.debug(`Deleted S3 file: ${document.s3Key}`);
        } catch (error) {
          this.logger.error(`Failed to delete S3 file ${document.s3Key}:`, error);
        }
      }

      const deleteResult = await this.documentRepository.delete({
        estateId: IsNull(),
      });

      this.logger.log(
        `Cleanup completed. Deleted ${deleteResult.affected || 0} unlinked documents.`,
      );
    } catch (error) {
      this.logger.error('Error during document cleanup:', error);
    }
  }
}

