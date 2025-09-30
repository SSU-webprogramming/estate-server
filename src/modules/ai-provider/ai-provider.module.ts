import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TextGeneratorPort } from '../document-analyzer/ports/text-generator.port';
import { GeminiService } from './gemini/services/gemini.service';
import { ChatGptService } from './chatgpt/services/chatgpt.service';

@Module({
  providers: [
    GeminiService,
    ChatGptService,
    {
      provide: TextGeneratorPort,
      useFactory: (
        configService: ConfigService,
        geminiService: GeminiService,
        chatGptService: ChatGptService,
      ) => {
        const provider = configService.get<string>('AI_PROVIDER');
        if (provider === 'chatgpt') {
          return chatGptService;
        }
        return geminiService;
      },
      inject: [ConfigService, GeminiService, ChatGptService],
    },
  ],
  exports: [TextGeneratorPort],
})
export class AiProviderModule {}
