import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { Term } from './entities/term.entity';
import { CreateTermDto } from './dto/request/create-term.dto';
import { UpdateTermDto } from './dto/request/update-term.dto';
import { TermResponseDto } from './dto/response/term-response.dto';
import { TermMapper } from './mapper/term.mapper';

@Injectable()
export class TermService {
  constructor(
    @InjectRepository(Term)
    private readonly termRepository: Repository<Term>,
  ) {}

  /**
   * 모든 약관 목록 조회
   * 정렬: 필수 > 선택, 생성일 순
   */
  async findAll(): Promise<TermResponseDto[]> {
    const terms = await this.termRepository.find({
      order: {
        isRequired: 'DESC',
        createdAt: 'ASC',
      },
    });
    return TermMapper.toResponseDtoList(terms);
  }

  /**
   * 회원이 동의한 약관 목록 조회
   * 정렬: 필수 > 선택, 생성일 내림차순
   */
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

    const terms = await this.termRepository.find({
      where: {
        id: In(agreedTermIds),
      },
      order: {
        isRequired: 'DESC',
        createdAt: 'DESC',
      },
    });

    return TermMapper.toResponseDtoList(terms);
  }

  /**
   * 약관 생성
   */
  async create(dto: CreateTermDto): Promise<TermResponseDto> {
    const term = this.termRepository.create(TermMapper.fromCreateDto(dto));
    const savedTerm = await this.termRepository.save(term);
    return TermMapper.toResponseDto(savedTerm);
  }

  /**
   * 약관 수정
   */
  async update(id: number, dto: UpdateTermDto): Promise<TermResponseDto> {
    const term = await this.termRepository.findOne({ where: { id } });
    if (!term) {
      throw new NotFoundException(`Term with ID ${id} not found`);
    }

    const updateData = TermMapper.fromUpdateDto(dto);
    Object.assign(term, updateData);

    const updatedTerm = await this.termRepository.save(term);
    return TermMapper.toResponseDto(updatedTerm);
  }
}
