import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';
import { CustomException } from '@/common/errors/custom-exception';
import { ErrorCode } from '@/common/errors/error';
import {
  FileWithMimeType,
  TextGeneratorPort,
} from '@/modules/estate-analysis-report/ports/text-generator.port';
import { Observable } from 'rxjs';

@Injectable()
export class ChatGptService implements TextGeneratorPort {
  private readonly openai: OpenAI;
  private readonly gptModelName: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      throw new CustomException(ErrorCode.GPT_API_KEY_INVALID);
    }
    this.openai = new OpenAI({ apiKey });

    const modelName = this.configService.get<string>('GPT_MODEL_NAME');
    if (!modelName) {
      throw new CustomException(ErrorCode.GPT_MODEL_NAME_INVALID);
    }
    this.gptModelName = modelName;
  }

  async generateText(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: this.gptModelName,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 1024,
      });

      const content = response.choices[0].message.content;
      if (content === null) {
        throw new CustomException(ErrorCode.GPT_API_REQUEST_FAILED);
      }
      return content;
    } catch (error) {
      console.error('Error generating text with ChatGPT:', error);
      throw new CustomException(ErrorCode.GPT_API_REQUEST_FAILED);
    }
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
        model: this.gptModelName,
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
        throw new CustomException(ErrorCode.GPT_API_REQUEST_FAILED);
      }
      return content;
    } catch (error) {
      console.error('Error generating text from image with ChatGPT:', error);
      throw new CustomException(ErrorCode.GPT_API_REQUEST_FAILED);
    }
  }

  async generateTextFromImages(
    systemPrompt: string,
    userPrompt: string,
    files: FileWithMimeType[],
  ): Promise<string> {
    try {
      const imageUrls = files.map((file) => {
        const base64Image = file.buffer.toString('base64');
        return `data:${file.mimeType};base64,${base64Image}`;
      });

      const userContent: ChatCompletionMessageParam['content'] = [
        { type: 'text', text: userPrompt },
        ...imageUrls.map((url) => ({
          type: 'image_url' as const,
          image_url: { url },
        })),
      ];

      const response = await this.openai.chat.completions.create({
        model: this.gptModelName,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userContent,
          },
        ],
        max_tokens: 2048,
      });

      const content = response.choices[0].message.content;
      if (content === null) {
        throw new CustomException(ErrorCode.GPT_API_REQUEST_FAILED);
      }
      return content;
    } catch (error) {
      console.error('Error generating text from images with ChatGPT:', error);
      throw new CustomException(ErrorCode.GPT_API_REQUEST_FAILED);
    }
  }

  generateTextFromImageStream(
    systemPrompt: string,
    userPrompt: string,
    fileBuffer: Buffer,
    mimeType: string,
  ): Observable<string> {
    return this.generateTextFromImagesStream(systemPrompt, userPrompt, [
      { buffer: fileBuffer, mimeType },
    ]);
  }

  generateTextFromImagesStream(
    systemPrompt: string,
    userPrompt: string,
    files: FileWithMimeType[],
  ): Observable<string> {
    return new Observable((subscriber) => {
      const imageUrls = files.map((file) => {
        const base64Image = file.buffer.toString('base64');
        return `data:${file.mimeType};base64,${base64Image}`;
      });

      const userContent: ChatCompletionMessageParam['content'] = [
        { type: 'text', text: userPrompt },
        ...imageUrls.map((url) => ({
          type: 'image_url' as const,
          image_url: { url },
        })),
      ];

      const streamCompletion = async () => {
        try {
          const stream = await this.openai.chat.completions.create({
            model: this.gptModelName,
            messages: [
              {
                role: 'system',
                content: systemPrompt,
              },
              {
                role: 'user',
                content: userContent,
              },
            ],
            max_tokens: 2048,
            stream: true,
          });

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              subscriber.next(content);
            }
          }
          subscriber.complete();
        } catch (error) {
          console.error('Error streaming text from image with ChatGPT:', error);
          subscriber.error(
            new CustomException(ErrorCode.GPT_API_REQUEST_FAILED),
          );
        }
      };

      streamCompletion();
    });
  }
}
