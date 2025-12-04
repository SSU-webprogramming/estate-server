import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiProviderModule } from '../ai-provider/ai-provider.module';
import { EstateAnalysisReport } from './entities/estate-analysis-report.entity';
import { EstateAnalysisReportService } from './services/estate-analysis-report.service';
import { EstateAnalysisReportController } from './controller/estate-analysis-report.controller';
import { Estate } from '../estate/entities/estate.entity';
import { Document } from '../document/entities/document.entity';
import { OcrModule } from '../ocr/ocr.module';
import { S3Module } from '../s3/s3.module';
import { RedisModule } from '../redis/redis.module';
import { EstateAnalysisReportCacheService } from './services/estate-analysis-report-cache.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([EstateAnalysisReport, Estate, Document]),
    AiProviderModule,
    OcrModule,
    S3Module,
    RedisModule.register(),
  ],
  controllers: [EstateAnalysisReportController],
  providers: [EstateAnalysisReportService, EstateAnalysisReportCacheService],
  exports: [EstateAnalysisReportService],
})
export class EstateAnalysisReportModule {}

