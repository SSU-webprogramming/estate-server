import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Estate } from './entities/estate.entity';
import { EstateService } from './services/estate.service';
import { EstateController } from './controllers/estate.controller';
import { DocumentModule } from '@/modules/document/document.module';
import { EstateRepository } from './repositories/estate.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Estate]), DocumentModule],
  controllers: [EstateController],
  providers: [EstateService, EstateRepository],
  exports: [EstateService, EstateRepository],
})
export class EstateModule {}

