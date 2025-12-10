import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiProviderModule } from '@/modules/ai-provider/ai-provider.module';
import { EstateAnalysisReport } from './entities/estate-analysis-report.entity';
import { EstateAnalysisReportService } from './services/estate-analysis-report.service';
import { EstateAnalysisReportController } from './controllers/estate-analysis-report.controller';
import { Estate } from '@/modules/estate/entities/estate.entity';
import { Document } from '@/modules/document/entities/document.entity';
import { OcrModule } from '@/modules/ocr/ocr.module';
import { S3Module } from '@/modules/s3/s3.module';
import { RedisModule } from '@/modules/redis/redis.module';
import { EstateAnalysisReportCacheService } from './services/estate-analysis-report-cache.service';
import { DocumentProcessingService } from './services/document-processing.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([EstateAnalysisReport, Estate, Document]),
    AiProviderModule,
    OcrModule,
    S3Module,
    RedisModule.register(),
  ],
  controllers: [EstateAnalysisReportController],
  providers: [
    EstateAnalysisReportService,
    EstateAnalysisReportCacheService,
    DocumentProcessingService,
  ],
  exports: [EstateAnalysisReportService],
})
export class EstateAnalysisReportModule {}

