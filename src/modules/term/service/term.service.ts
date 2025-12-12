import { Injectable } from '@nestjs/common';
import { User } from '@/modules/user/entities/user.entity';
import { Term } from './entities/term.entity';
import { CreateTermDto } from './dto/request/create-term.dto';
import { UpdateTermDto } from './dto/request/update-term.dto';
import { TermResponseDto } from './dto/response/term-response.dto';
import { TermMapper } from './mapper/term.mapper';
import { CustomException } from '@/common/errors/custom-exception';
import { ErrorCode } from '@/common/errors/error';
import { TermRepository } from './repositories/term.repository';

@Injectable()
export class TermService {
  constructor(
    private readonly termRepository: TermRepository,
  ) {}

  async findAll(): Promise<TermResponseDto[]> {
    const terms = await this.termRepository.findAll();
    return TermMapper.toResponseDtoList(terms);
  }

  async findAgreedTerms(user: User): Promise<TermResponseDto[]> {
    const agreedTermsMap = user.agreedTerms;

    if (!agreedTermsMap) {
      return [];
    }

    const agreedTermIds = Object.entries(agreedTermsMap)
      .filter(([_, isAgreed]) => isAgreed)
      .map(([termId]) => Number(termId));

    if (agreedTermIds.length === 0) {
      return [];
    }

    const terms = await this.termRepository.findByIds(agreedTermIds);

    return TermMapper.toResponseDtoList(terms);
  }

  async create(dto: CreateTermDto): Promise<TermResponseDto> {
    const termData = TermMapper.fromCreateDto(dto);
    const term = this.termRepository.create(termData);
    const savedTerm = await this.termRepository.save(term);
    return TermMapper.toResponseDto(savedTerm);
  }

  async update(id: number, dto: UpdateTermDto): Promise<TermResponseDto> {
    const term = await this.termRepository.findOne(id);
    if (!term) {
      throw new CustomException(ErrorCode.TERM_NOT_FOUND);
    }

    const updateData = TermMapper.fromUpdateDto(dto);
    Object.assign(term, updateData);

    const updatedTerm = await this.termRepository.save(term);
    return TermMapper.toResponseDto(updatedTerm);
  }
}
