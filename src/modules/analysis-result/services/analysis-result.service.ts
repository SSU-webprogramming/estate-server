import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalysisResult } from '../entities/analysis-result.entity';

@Injectable()
export class AnalysisResultService {
  constructor(
    @InjectRepository(AnalysisResult)
    private readonly analysisResultRepository: Repository<AnalysisResult>,
  ) {}

  async create(
    createData: Partial<AnalysisResult>,
  ): Promise<AnalysisResult> {
    const analysisResult = this.analysisResultRepository.create(createData);
    return this.analysisResultRepository.save(analysisResult);
  }

  async findAll(): Promise<AnalysisResult[]> {
    return this.analysisResultRepository.find({
      order: { analyzedAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<AnalysisResult> {
    const result = await this.analysisResultRepository.findOne({
      where: { id },
    });
    if (!result) {
      throw new Error(`AnalysisResult with id ${id} not found`);
    }
    return result;
  }

  async findByAddress(address: string): Promise<AnalysisResult[]> {
    return this.analysisResultRepository.find({
      where: { address },
      order: { analyzedAt: 'DESC' },
    });
  }

  async findLatestByAddress(address: string): Promise<AnalysisResult | null> {
    return this.analysisResultRepository.findOne({
      where: { address },
      order: { analyzedAt: 'DESC' },
    });
  }

  async update(
    id: number,
    updateData: Partial<AnalysisResult>,
  ): Promise<AnalysisResult> {
    const result = await this.findOne(id);
    Object.assign(result, updateData);
    return this.analysisResultRepository.save(result);
  }

  async remove(id: number): Promise<void> {
    const result = await this.analysisResultRepository.delete(id);
    if (result.affected === 0) {
      throw new Error(`AnalysisResult with id ${id} not found`);
    }
  }
}

