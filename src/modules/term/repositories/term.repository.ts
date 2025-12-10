import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Term } from '@/modules/term/entities/term.entity';

@Injectable()
export class TermRepository {
  constructor(
    @InjectRepository(Term)
    private readonly repository: Repository<Term>,
  ) {}

  async findAll(): Promise<Term[]> {
    return this.repository.find({
      order: {
        isRequired: 'DESC',
        createdAt: 'ASC',
      },
    });
  }

  async findByIds(ids: number[]): Promise<Term[]> {
    return this.repository.find({
      where: {
        id: In(ids),
      },
      order: {
        isRequired: 'DESC',
        createdAt: 'DESC',
      },
    });
  }

  async findOne(id: number): Promise<Term | null> {
    return this.repository.findOne({ where: { id } });
  }

  create(term: Partial<Term>): Term {
    return this.repository.create(term);
  }

  async save(term: Term): Promise<Term> {
    return this.repository.save(term);
  }
}

