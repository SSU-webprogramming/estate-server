import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalysisResult } from './entities/analysis-result.entity';
import { Estate } from '../estate/entities/estate.entity';
import { AnalysisResultService } from './services/analysis-result.service';

@Module({
  imports: [TypeOrmModule.forFeature([AnalysisResult, Estate])],
  providers: [AnalysisResultService],
  exports: [AnalysisResultService],
})
export class AnalysisResultModule {}

