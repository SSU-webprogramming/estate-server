import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { CustomException } from 'src/common/errors/custom-exception';
import { ErrorCode } from 'src/common/errors/error';
import { TextGeneratorPort } from '../../../document-analyzer/ports/text-generator.port';

@Injectable()
export class ChatGptService implements TextGeneratorPort {
  private readonly openai: OpenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      // A more specific error code could be created for this
      throw new CustomException(ErrorCode.GEMINI_API_KEY_INVALID);
    }
    this.openai = new OpenAI({ apiKey });
  }

  async generateTextFromImage(
    systemPrompt: string,
    userPrompt: string,
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    try {
      const base64Image = fileBuffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64Image}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: dataUrl,
                },
              },
            ],
          },
        ],
        max_tokens: 2048,
      });

      const content = response.choices[0].message.content;
      if (content === null) {
        throw new Error('ChatGPT returned null content.');
      }
      return content;
    } catch (error) {
      console.error('Error generating text from image with ChatGPT:', error);
      // A more specific error code could be created for this
      throw new CustomException(ErrorCode.GPT_API_REQUEST_FAILED);
    }
  }
}