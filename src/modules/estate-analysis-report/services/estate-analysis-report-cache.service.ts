import { Injectable } from '@nestjs/common';
import { RedisService } from '@/modules/redis/redis.service';
import { EstateAnalysisReportResponseDto } from '@/modules/estate-analysis-report/dto/response/estate-analysis-report-response.dto';
import { CustomException } from '@/common/errors/custom-exception';
import { ErrorCode } from '@/common/errors/error';
import { Duration } from 'js-joda';

@Injectable()
export class EstateAnalysisReportCacheService {
  private readonly ttlSeconds = Duration.ofSeconds(300).seconds(); // TODO: 환경 변수로 추출 가능

  constructor(private readonly redisService: RedisService) {}

  async get(estateId: number): Promise<EstateAnalysisReportResponseDto | null> {
    const cacheKey = this.getCacheKey(estateId);
    const cached = await this.redisService.get(cacheKey);

    if (!cached) {
      return null;
    }

    try {
      return JSON.parse(cached) as unknown as EstateAnalysisReportResponseDto;
    } catch {
      console.error(`[EstateAnalysisReportCache] 캐시 파싱 실패: ${cacheKey}`);
      throw new CustomException(ErrorCode.CACHE_PARSE_ERROR, '캐시 파싱 실패');
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