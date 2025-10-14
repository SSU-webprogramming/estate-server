import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from './entities/document.entity';
import { DocumentService } from './services/document.service';
import { DocumentController } from './controllers/document.controller';
import { S3Module } from '../s3/s3.module';
import { AiProviderModule } from '../ai-provider/ai-provider.module';
import { OcrModule } from '../ocr/ocr.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document]),
    S3Module,
    AiProviderModule,
    OcrModule,
  ],
  controllers: [DocumentController],
  providers: [DocumentService],
})
export class DocumentModule {}
