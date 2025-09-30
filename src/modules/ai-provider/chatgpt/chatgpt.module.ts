import { Module } from '@nestjs/common';
import { ChatGptService } from './services/chatgpt.service';

@Module({
  providers: [ChatGptService],
  exports: [ChatGptService],
})
export class ChatGptModule {}
