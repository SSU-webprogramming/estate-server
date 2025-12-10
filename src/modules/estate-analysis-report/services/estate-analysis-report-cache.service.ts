import { Injectable } from '@nestjs/common';
import { RedisService } from '@/modules/redis/redis.service';
import { EstateAnalysisReportResponseDto } from '@/modules/estate-analysis-report/dto/response/estate-analysis-report-response.dto';

@Injectable()
export class EstateAnalysisReportCacheService {
  private readonly ttlSeconds = 300; // TODO: 환경 변수로 추출 가능

  constructor(private readonly redisService: RedisService) {}

  async get(estateId: number): Promise<EstateAnalysisReportResponseDto | null> {
    const cacheKey = this.getCacheKey(estateId);
    const cached = await this.redisService.get(cacheKey);

    if (!cached) {
      return null;
    }

    try {
      return JSON.parse(
        cached,
      ) as unknown as EstateAnalysisReportResponseDto;
    } catch {
      return null;
    }
  }

  async set(estateId: number,value: EstateAnalysisReportResponseDto): Promise<void> {
    const cacheKey = this.getCacheKey(estateId);
    await this.redisService.set(
      cacheKey,
      JSON.stringify(value),
      this.ttlSeconds,
    );
  }

  async invalidate(estateId: number): Promise<void> {
    const cacheKey = this.getCacheKey(estateId);
    await this.redisService.del(cacheKey);
  }

  private getCacheKey(estateId: number): string {
    return `estate-analysis:${estateId}`;
  }
}