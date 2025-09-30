import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Document } from './entities/document.entity';
import { DocumentService } from './services/document.service';
import { DocumentController } from './controllers/document.controller';
import { S3Module } from '../s3/s3.module';
import { S3Port } from '../../common/ports/s3.port';
import { S3Service } from '../s3/services/s3.service';
import { AiProviderModule } from '../ai-provider/ai-provider.module';

@Module({
  imports: [TypeOrmModule.forFeature([Document]), S3Module, AiProviderModule],
  controllers: [DocumentController],
  providers: [
    DocumentService,
    {
      provide: S3Port,
      useClass: S3Service,
    },
  ],
})
export class DocumentModule {}
