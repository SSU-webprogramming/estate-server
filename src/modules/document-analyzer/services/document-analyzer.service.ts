import { Injectable } from '@nestjs/common';
import { TextGeneratorPort } from '../ports/text-generator.port';
import { SYSTEM_PROMPT } from '../prompts/system.prompt';

@Injectable()
export class DocumentAnalyzerService {
  constructor(private readonly textGeneratorPort: TextGeneratorPort) {}

  async analyzeDocument(fileBuffer: Buffer, mimeType: string): Promise<string> {
    const userPrompt = `다음 문서를 분석하세요.`;

    return this.textGeneratorPort.generateTextFromImage(
      SYSTEM_PROMPT,
      userPrompt,
      fileBuffer,
      mimeType,
    );
  }
}
