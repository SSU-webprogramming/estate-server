import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Estate } from './entities/estate.entity';
import { EstateService } from './services/estate.service';

@Module({
  imports: [TypeOrmModule.forFeature([Estate])],
  providers: [EstateService],
  exports: [EstateService],
})
export class EstateModule {}

