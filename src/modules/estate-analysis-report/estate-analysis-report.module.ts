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
import { AddressBasedCacheStrategyService } from './services/address-based-cache-strategy.service';
import { ANALYSIS_CACHE_STRATEGY_PORT } from './ports/analysis-cache-strategy.port';

/**
 * EstateAnalysisReportModule
 * 
 * SOLID 원칙 적용:
 * - 의존성 역전 원칙(DIP): AnalysisCacheStrategyPort 인터페이스를 통한 추상화
 * - 개방-폐쇄 원칙(OCP): 새로운 캐싱 전략 추가 시 기존 코드 수정 없이 확장 가능
 * 
 * Redis 기반 캐싱:
 * - AddressBasedCacheStrategyService는 Redis를 사용하여 초고속 캐싱 제공
 * - TTL 90일 자동 만료
 */
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
    {
      provide: ANALYSIS_CACHE_STRATEGY_PORT,
      useClass: AddressBasedCacheStrategyService,
    },
  ],
  exports: [EstateAnalysisReportService],
})
export class EstateAnalysisReportModule {}

