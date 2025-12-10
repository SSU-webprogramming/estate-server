import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EstateAnalysisReport } from '@/modules/estate-analysis-report/entities/estate-analysis-report.entity';

@Injectable()
export class EstateAnalysisReportRepository {
  constructor(
    @InjectRepository(EstateAnalysisReport)
    private readonly repository: Repository<EstateAnalysisReport>,
  ) {}

  async create(report: Partial<EstateAnalysisReport>): Promise<EstateAnalysisReport> {
    return this.repository.create(report);
  }

  async save(report: EstateAnalysisReport): Promise<EstateAnalysisReport> {
    return this.repository.save(report);
  }

  async findByEstateId(estateId: number): Promise<EstateAnalysisReport | null> {
    return this.repository.findOne({
      where: { estateId },
    });
  }

  async createQueryBuilder(alias: string) {
    return this.repository.createQueryBuilder(alias);
  }
}