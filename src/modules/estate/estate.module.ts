import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Estate } from './entities/estate.entity';
import { EstateService } from './services/estate.service';
import { EstateController } from './controllers/estate.controller';
import { DocumentModule } from '@/modules/document/document.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Estate]),
    DocumentModule,
  ],
  controllers: [EstateController],
  providers: [EstateService],
  exports: [EstateService],
})
export class EstateModule {}

