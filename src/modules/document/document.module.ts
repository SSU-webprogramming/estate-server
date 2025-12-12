import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from '@/modules/document/entities/document.entity';
import { Estate } from '@/modules/estate/entities/estate.entity';
import { DocumentService } from '@/modules/document/services/document.service';
import { DocumentController } from '@/modules/document/controllers/document.controller';
import { DocumentCleanupService } from '@/modules/document/services/document-cleanup.service';
import { S3Module } from '@/modules/s3/s3.module';
import { AiProviderModule } from '@/modules/ai-provider/ai-provider.module';
import { OcrModule } from '@/modules/ocr/ocr.module';
import { DocumentRepository } from '@/modules/document/repositories/document.repository';
import { IDocumentRepository } from '@/common/ports/document-repository.port';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, Estate]),
    S3Module,
    AiProviderModule,
    OcrModule,
  ],
  controllers: [DocumentController],
  providers: [
    DocumentService,
    DocumentCleanupService,
    DocumentRepository,
    {
      provide: 'IDocumentRepository',
      useClass: DocumentRepository,
    },
  ],
  exports: [DocumentService],
})
export class DocumentModule {}
