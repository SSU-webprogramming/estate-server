import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import FormData from 'form-data';
import { v4 as uuidv4 } from 'uuid';
import { OcrPort } from '../../../common/ports/ocr.port';

@Injectable()
export class OcrService implements OcrPort{
  private readonly apiKey: string;
  private readonly apiGateway: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('clova.apiKey') || "";
    this.apiGateway = this.configService.get<string>('clova.apiGateway') || "";
  }

  async extractTextFromBase64Images(
    base64Images: Array<{ base64: string; mimeType: string; name: string }>,
  ): Promise<string> {
    const allTexts: string[] = [];

    // Naver Clova OCR은 한 번에 하나의 이미지만 처리 가능
    for (const item of base64Images) {
      const message = {
        version: 'V2',
        requestId: uuidv4(),
        timestamp: Date.now(),
        images: [
          {
            format: item.mimeType.split('/')[1], // jpeg, png 등
            name: item.name,
            data: item.base64, // Base64 인코딩된 바이너리 데이터
          },
        ],
      };

      console.log('OCR Request:', {
        imageName: item.name,
        format: item.mimeType.split('/')[1],
        dataLength: item.base64.length,
      });

      try {
        const response = await axios.post(this.apiGateway, message, {
          headers: {
            'Content-Type': 'application/json',
            'X-OCR-SECRET': this.apiKey,
          },
        });

        // 응답에서 텍스트 추출
        const text = response.data.images
        .map((image) =>
          image.fields.map((field) => field.inferText).join(' '),
        )
        .join('\n');

        allTexts.push(text);
        console.log(`OCR completed for ${item.name}`);
        console.log('OCR Response:', text);
      } catch (error) {
        console.error(`OCR failed for image ${item.name}:`, error.response?.data || error.message);
        throw error;
      }
    }

    // 모든 이미지의 텍스트를 합쳐서 반환
    return allTexts.join('\n\n');
  }
}
