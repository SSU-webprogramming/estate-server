import { Module } from '@nestjs/common';
import { DocumentAnalyzerController } from './controllers/document-analyzer.controller';
import { DocumentAnalyzerService } from './services/document-analyzer.service';
import { AiProviderModule } from '../ai-provider/ai-provider.module';

@Module({
  imports: [AiProviderModule],
  controllers: [DocumentAnalyzerController],
  providers: [DocumentAnalyzerService],
})
export class DocumentAnalyzerModule {}
