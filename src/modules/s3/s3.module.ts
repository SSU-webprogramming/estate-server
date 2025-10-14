import { Module } from '@nestjs/common';
import { S3Service } from './services/s3.service';
import { S3Port } from '../../common/ports/s3.port';

@Module({
  providers: [
    {
      provide: S3Port,
      useClass: S3Service,
    },
  ],
  exports: [S3Port],
})
export class S3Module {}
