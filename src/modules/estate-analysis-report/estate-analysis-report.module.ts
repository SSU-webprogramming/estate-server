import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiProviderModule } from '../ai-provider/ai-provider.module';
import { AnalysisResult } from './entities/estate-analysis-report.entity';
import { EstateAnalysisReportService } from './services/estate-analysis-report.service';

@Module({
  imports: [TypeOrmModule.forFeature([AnalysisResult]), AiProviderModule],
  providers: [EstateAnalysisReportService],
  exports: [EstateAnalysisReportService],
})
export class EstateAnalysisReportModule {}

