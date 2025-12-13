import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Term } from '@/modules/term/entities/term.entity';
import { TermController } from '@/modules/term/controller/term.controller';
import { TermService } from '@/modules/term/service/term.service';
import { TermRepository } from '@/modules/term/repositories/term.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Term])],
  controllers: [TermController],
  providers: [TermService, TermRepository],
  exports: [TermService],
})
export class TermModule {}
