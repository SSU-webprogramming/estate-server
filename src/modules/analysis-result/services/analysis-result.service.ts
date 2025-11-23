import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalysisResult } from '../entities/analysis-result.entity';
import { Estate } from '../../estate/entities/estate.entity';

@Injectable()
export class AnalysisResultService {
  constructor(
    @InjectRepository(AnalysisResult)
    private readonly analysisResultRepository: Repository<AnalysisResult>,
    @InjectRepository(Estate)
    private readonly estateRepository: Repository<Estate>,
  ) {}

  async create(
    estateId: string,
    analysisScore: number | null,
  ): Promise<AnalysisResult> {
    const estate = await this.estateRepository.findOne({
      where: { estateId },
    });

    if (!estate) {
      throw new Error(`Estate with id ${estateId} not found`);
    }

    const analysisResult = this.analysisResultRepository.create({
      estateId,
      estate,
      analysisScore,
    });

    return this.analysisResultRepository.save(analysisResult);
  }

  async findAll(): Promise<AnalysisResult[]> {
    return this.analysisResultRepository.find({
      relations: ['estate'],
    });
  }

  async findOne(resultId: number): Promise<AnalysisResult> {
    const result = await this.analysisResultRepository.findOne({
      where: { resultId },
      relations: ['estate'],
    });
    if (!result) {
      throw new Error(`AnalysisResult with id ${resultId} not found`);
    }
    return result;
  }

  async findByEstateId(estateId: string): Promise<AnalysisResult[]> {
    return this.analysisResultRepository.find({
      where: { estateId },
      relations: ['estate'],
      order: { analyzedAt: 'DESC' },
    });
  }

  async findLatestByEstateId(estateId: string): Promise<AnalysisResult | null> {
    return this.analysisResultRepository.findOne({
      where: { estateId },
      relations: ['estate'],
      order: { analyzedAt: 'DESC' },
    });
  }

  async update(
    resultId: number,
    updateData: Partial<AnalysisResult>,
  ): Promise<AnalysisResult> {
    const result = await this.findOne(resultId);
    Object.assign(result, updateData);
    return this.analysisResultRepository.save(result);
  }

  async remove(resultId: number): Promise<void> {
    const result = await this.analysisResultRepository.delete(resultId);
    if (result.affected === 0) {
      throw new Error(`AnalysisResult with id ${resultId} not found`);
    }
  }
}

