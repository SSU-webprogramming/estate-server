import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalysisResult } from './entities/analysis-result.entity';
import { AnalysisResultService } from './services/analysis-result.service';

@Module({
  imports: [TypeOrmModule.forFeature([AnalysisResult])],
  providers: [AnalysisResultService],
  exports: [AnalysisResultService],
})
export class AnalysisResultModule {}

