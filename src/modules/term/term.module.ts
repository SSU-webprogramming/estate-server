import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Term } from './entities/term.entity';
import { TermController } from './term.controller';
import { TermService } from './term.service';
import { TermRepository } from './repositories/term.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Term])],
  controllers: [TermController],
  providers: [TermService, TermRepository],
  exports: [TermService],
})
export class TermModule {}
