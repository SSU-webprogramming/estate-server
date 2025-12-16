import { Injectable } from '@nestjs/common';
import { AnalysisCacheStrategyPort } from '@/modules/estate-analysis-report/ports/analysis-cache-strategy.port';
import { EstateAnalysisReport } from '@/modules/estate-analysis-report/entities/estate-analysis-report.entity';
import { EstateAnalysisReportRepository } from '@/modules/estate-analysis-report/repositories/estate-analysis-report.repository';
import { RedisService } from '@/modules/redis/redis.service';
import { normalizeAddress } from '@/common/utils/address.util';
import { Duration } from 'js-joda';

/**
 * 주소 기반 분석 캐싱 전략
 * Redis를 활용한 O(1) 캐시 조회, TTL 90일
 */
@Injectable()
export class AddressBasedCacheStrategyService implements AnalysisCacheStrategyPort {
  private readonly MAX_CACHE_AGE_DAYS = 90;
  private readonly CACHE_TTL_SECONDS = Duration.ofDays(90).seconds();

  constructor(
    private readonly redisService: RedisService,
    private readonly analysisReportRepository: EstateAnalysisReportRepository,
  ) {}

  /**
   * 주소 기반으로 캐시된 분석 결과 조회
   * @param address 검색할 주소
   * @param userId 사용자 ID (선택)
   * @returns 캐시된 분석 결과 또는 null
   */
  async findCachedAnalysis(
    address: string,
    userId?: number,
  ): Promise<EstateAnalysisReport | null> {
    // 목적: 너무 짧은 주소는 캐시 오류 방지
    if (!this.isCacheable(address)) {
      console.log(`[AddressBasedCache-Redis] 캐시 불가능 (주소 너무 짧음): ${address}`);
      return null;
    }

    const normalized = normalizeAddress(address);
    const cacheKey = this.getCacheKey(address, userId);
    
    console.log(`[AddressBasedCache-Redis] 캐시 조회 시작`);
    console.log(`  - 원본 주소: "${address}"`);
    console.log(`  - 정규화 주소: "${normalized}"`);
    console.log(`  - userId: ${userId}`);
    console.log(`  - Redis 키: "${cacheKey}"`);

    try {
      // 목적: Redis에서 O(1) 시간복잡도로 estateId 조회
      const cachedEstateId = await this.redisService.get(cacheKey);

      if (!cachedEstateId) {
        console.log(`[AddressBasedCache-Redis] ❌ 캐시 미스`);
        return null;
      }

      console.log(`  - Redis에서 조회된 estateId: ${cachedEstateId}`);

      // estateId로 실제 분석 결과 조회 (DB 쿼리 최소화)
      const estateId = parseInt(cachedEstateId, 10);
      const analysis = await this.analysisReportRepository.findOneByEstateId(estateId);

      // 데이터 정합성 보장 (Redis-DB 불일치 방지)
      if (!analysis) {
        await this.redisService.del(cacheKey);
        console.log(`[AddressBasedCache-Redis] ❌ 캐시 불일치, 무효화`);
        return null;
      }

      // 목적: 오래된 분석 결과 자동 제거 (데이터 신선도 유지)
      if (!this.isAnalysisValid(analysis)) {
        await this.redisService.del(cacheKey);
        console.log(`[AddressBasedCache-Redis] ❌ 캐시 만료, 무효화 (${this.MAX_CACHE_AGE_DAYS}일 초과)`);
        return null;
      }

      console.log(`[AddressBasedCache-Redis] ✅ 캐시 히트! (estateId: ${estateId})`);
      return analysis;

    } catch (error) {
      console.error(`[AddressBasedCache-Redis] ❌ 캐시 조회 에러:`, error);
      return null;
    }
  }

  /**
   * 분석 결과를 Redis 캐시에 저장
   * @param address 주소
   * @param userId 사용자 ID
   * @param estateId Estate ID
   */
  async saveCachedAnalysis(
    address: string,
    userId: number,
    estateId: number,
  ): Promise<void> {
    // 목적: 너무 짧은 주소는 캐시 오류 방지
    if (!this.isCacheable(address)) {
      console.log(`[AddressBasedCache-Redis] 캐시 저장 불가 (주소 너무 짧음): ${address}`);
      return;
    }

    const normalized = normalizeAddress(address);
    const cacheKey = this.getCacheKey(address, userId);

    console.log(`[AddressBasedCache-Redis] 💾 캐시 저장 시작`);
    console.log(`  - 원본 주소: "${address}"`);
    console.log(`  - 정규화 주소: "${normalized}"`);
    console.log(`  - userId: ${userId}`);
    console.log(`  - estateId: ${estateId}`);
    console.log(`  - Redis 키: "${cacheKey}"`);
    console.log(`  - TTL: ${this.CACHE_TTL_SECONDS}초 (${this.MAX_CACHE_AGE_DAYS}일)`);

    try {
      // 목적: TTL로 자동 만료되는 캐시 저장 (메모리 관리)
      await this.redisService.set(
        cacheKey,
        estateId.toString(),
        this.CACHE_TTL_SECONDS,
      );

      console.log(`[AddressBasedCache-Redis] ✅ 캐시 저장 완료!`);
    } catch (error) {
      console.error(`[AddressBasedCache-Redis] ❌ 캐시 저장 에러:`, error);
      // 목적: 캐시 실패가 비즈니스 로직을 중단시키지 않도록 함
    }
  }

  /**
   * Redis 캐시 키 생성 (정규화된 주소 + 사용자별 격리)
   */
  private getCacheKey(address: string, userId?: number): string {
    const normalized = normalizeAddress(address);
    // 목적: 사용자별 캐시 격리 (개인정보 보호)
    const userPart = userId ? `:${userId}` : ':global';
    return `estate-analysis:by-address:${normalized}${userPart}`;
  }

  /**
   * 분석 결과 유효성 체크 (만료 기간 검증)
   */
  private isAnalysisValid(analysis: EstateAnalysisReport): boolean {
    if (!analysis.analyzedAt) {
      return false;
    }

    const now = new Date();
    const analyzedDate = new Date(analysis.analyzedAt);
    // 목적: 일 단위 차이 계산으로 오래된 분석 필터링
    const daysDiff = Math.floor(
      (now.getTime() - analyzedDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    return daysDiff <= this.MAX_CACHE_AGE_DAYS;
  }

  /**
   * 주소 캐시 가능 여부 검증
   */
  isCacheable(address: string): boolean {
    const normalized = normalizeAddress(address);
    return normalized.length >= 5;
  }

  /**
   * 전략 이름 반환 (디버깅용)
   */
  getStrategyName(): string {
    return 'AddressBasedCacheStrategy-Redis';
  }
}

