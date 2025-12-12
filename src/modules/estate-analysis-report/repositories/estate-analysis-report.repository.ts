import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EstateAnalysisReport } from '@/modules/estate-analysis-report/entities/estate-analysis-report.entity';
import { SearchEstateAnalysisDto } from '@/modules/estate-analysis-report/dto/request/search-estate-analysis.dto';
import { SafetyScoreSearchType } from '@/modules/estate-analysis-report/dto/request/safety-score-search-type.enum';
import { EstateAnalysisReportResponseDto } from '@/modules/estate-analysis-report/dto/response/estate-analysis-report-response.dto';
import { PaginationResponseDto, PaginationMetaDto } from '@/common/dto/pagination-response.dto';
import { EstateAnalysisReportMapper } from '@/modules/estate-analysis-report/mapper/estate-analysis-report.mapper';

@Injectable()
export class EstateAnalysisReportRepository {
  constructor(
    @InjectRepository(EstateAnalysisReport)
    private readonly repository: Repository<EstateAnalysisReport>,
  ) {}

  create(report: Partial<EstateAnalysisReport>): EstateAnalysisReport {
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

  async findAll(userId: number, query: SearchEstateAnalysisDto): Promise<PaginationResponseDto<EstateAnalysisReportResponseDto>> {
    const qb = this.repository
      .createQueryBuilder('report');

    qb.innerJoin('report.estate', 'estate');
    qb.where('estate.userId = :userId', { userId });

    if (query.address) {
      qb.andWhere('report.address LIKE :address', { address: `%${query.address}%` });
    }

    if (query.safetyScore) {
      if (query.safetyScore === SafetyScoreSearchType.SAFE) {
        qb.andWhere('report.safetyScore >= :minScore', { minScore: 80 });
      } else if (query.safetyScore === SafetyScoreSearchType.CAUTION) {
        qb.andWhere('report.safetyScore >= :minScore AND report.safetyScore < :maxScore', {
          minScore: 60,
          maxScore: 80,
        });
      } else if (query.safetyScore === SafetyScoreSearchType.DANGER) {
        qb.andWhere('report.safetyScore < :maxScore', { maxScore: 60 });
      }
    }

    qb.orderBy('report.analyzedAt', 'DESC');

    qb.skip(query.skip).take(query.limit);

    const [reports, total] = await qb.getManyAndCount();

    const data = reports.map((report) => EstateAnalysisReportMapper.toResponseDto(report));
    const meta = new PaginationMetaDto(query.page, query.limit, total);

    return new PaginationResponseDto(data, meta);
  }
}