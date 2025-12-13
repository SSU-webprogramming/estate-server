import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiProviderModule } from '@/modules/ai-provider/ai-provider.module';
import { EstateAnalysisReport } from './entities/estate-analysis-report.entity';
import { EstateAnalysisReportService } from './services/estate-analysis-report.service';
import { EstateAnalysisReportController } from './controllers/estate-analysis-report.controller';
import { OcrModule } from '@/modules/ocr/ocr.module';
import { S3Module } from '@/modules/s3/s3.module';
import { RedisModule } from '@/modules/redis/redis.module';
import { EstateModule } from '@/modules/estate/estate.module';
import { EstateAnalysisReportCacheService } from './services/estate-analysis-report-cache.service';
import { DocumentProcessingService } from './services/document-processing.service';
import { AddressBasedCacheStrategyService } from './services/address-based-cache-strategy.service';
import { ANALYSIS_CACHE_STRATEGY_PORT } from './ports/analysis-cache-strategy.port';
import { EstateAnalysisReportRepository } from './repositories/estate-analysis-report.repository';
import { DocumentModule } from '@/modules/document/document.module';
import { EstateModule } from '@/modules/estate/estate.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([EstateAnalysisReport]),
    AiProviderModule,
    OcrModule,
    S3Module,
    RedisModule.register(),
    DocumentModule,
    EstateModule,
  ],
  controllers: [EstateAnalysisReportController],
  providers: [
    EstateAnalysisReportService,
    EstateAnalysisReportRepository,
    EstateAnalysisReportCacheService,
    DocumentProcessingService,
    {
      provide: ANALYSIS_CACHE_STRATEGY_PORT,
      useClass: AddressBasedCacheStrategyService,
    },
  ],
  exports: [EstateAnalysisReportService],
})
export class EstateAnalysisReportModule {}

