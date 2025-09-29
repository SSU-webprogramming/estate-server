import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class DocumentAnalyzerService {
  private readonly geminiApi: GoogleGenerativeAI;

  constructor() {
    this.geminiApi = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  }

  async analyzeDocument(fileBuffer: Buffer, mimeType: string): Promise<string> {
    try {
      const model = this.geminiApi.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const imagePart = {
        inlineData: {
          data: fileBuffer.toString('base64'),
          mimeType: mimeType,
        },
      };

      const prompt = "이 문서/이미지를 분석하고 요약이나 해석을 제공하세요.";

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error analyzing document with Gemini API:', error);
      if (error.message.includes('API key not valid')) {
        throw new BadRequestException('Invalid Gemini API key. Please check your .env file.');
      }
      throw new InternalServerErrorException('Failed to analyze document with Gemini API. Check the server logs for more details.');
    }
  }
}
