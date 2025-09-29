import { Module } from '@nestjs/common';
import { DocumentAnalyzerController } from './controllers/document-analyzer.controller';
import { DocumentAnalyzerService } from './services/document-analyzer.service';

@Module({
  controllers: [DocumentAnalyzerController],
  providers: [DocumentAnalyzerService],
})
export class DocumentAnalyzerModule {}
