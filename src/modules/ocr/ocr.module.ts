import { Module } from '@nestjs/common';
import { OcrService } from './services/ocr.service';
import { ConfigModule } from '@nestjs/config';
import clovaConfig from '../../config/clova.config';
import { OcrPort } from '../../common/ports/ocr.port';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [clovaConfig],
    }),
  ],
  providers: [
    {
      provide: OcrPort,
      useClass: OcrService,
    },
  ],
  exports: [OcrPort],
})
export class OcrModule {}
