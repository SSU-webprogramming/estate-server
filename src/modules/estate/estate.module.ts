import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Estate } from './entities/estate.entity';
import { EstateService } from './services/estate.service';
import { EstateController } from './controllers/estate.controller';
import { Document } from '@/modules/document/entities/document.entity';
import { S3Module } from '@/modules/s3/s3.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Estate, Document]),
    S3Module,
  ],
  controllers: [EstateController],
  providers: [EstateService],
  exports: [EstateService],
})
export class EstateModule {}

