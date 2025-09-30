import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CustomException } from 'src/common/errors/custom-exception';
import { ErrorCode } from 'src/common/errors/error';
import { TextGeneratorPort } from 'src/modules/document-analyzer/ports/text-generator.port';

@Injectable()
export class GeminiService implements TextGeneratorPort {
  private readonly geminiApi: GoogleGenerativeAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new CustomException(ErrorCode.GEMINI_API_KEY_INVALID);
    }
    this.geminiApi = new GoogleGenerativeAI(apiKey);
  }

  async generateTextFromImage(
    systemPrompt: string,
    userPrompt: string,
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    try {
      const model = this.geminiApi.getGenerativeModel({
        model: 'gemini-2.5-flash',
      });

      const imagePart = {
        inlineData: {
          data: fileBuffer.toString('base64'),
          mimeType: mimeType,
        },
      };

      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              { text: systemPrompt },
              { text: userPrompt },
              imagePart,
            ],
          },
        ],
      });

      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini로 문서 분석 중 오류 발생:', error);
      if (error.message.includes('API key not valid')) {
        throw new CustomException(ErrorCode.GEMINI_API_KEY_INVALID);
      }
      throw new CustomException(ErrorCode.GEMINI_API_REQUEST_FAILED);
    }
  }
}
