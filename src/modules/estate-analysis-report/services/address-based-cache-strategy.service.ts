import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalysisCacheStrategyPort } from '@/modules/estate-analysis-report/ports/analysis-cache-strategy.port';
import { EstateAnalysisReport } from '@/modules/estate-analysis-report/entities/estate-analysis-report.entity';
import { RedisService } from '@/modules/redis/redis.service';
import { normalizeAddress } from '@/common/utils/address.util';

/**
 * 주소 기반 분석 캐싱 전략 서비스 (Redis 기반)
 * 
 * 전략 패턴(Strategy Pattern) 구현:
 * - AnalysisCacheStrategyPort 인터페이스를 구현
 * - Redis를 활용한 초고속 캐싱
 * 
 * 단일 책임 원칙(SRP):
 * - 주소 기반 캐시 검색만 담당
 * - 주소 정규화는 address.util에 위임
 * - Redis 접근은 RedisService에 위임
 * 
 * 캐싱 전략:
 * 1. 주소 정규화 → Redis 키 생성
 * 2. Redis에서 estateId 조회 (O(1) 시간 복잡도)
 * 3. estateId로 분석 결과 조회 (DB 쿼리 1회만)
 * 4. TTL 90일 자동 만료
 */
@Injectable()
export class AddressBasedCacheStrategyService implements AnalysisCacheStrategyPort {
  private readonly MAX_CACHE_AGE_DAYS = 90; // 90일 이내 분석만 캐시 사용
  private readonly CACHE_TTL_SECONDS = 90 * 24 * 60 * 60; // 90일 = 7,776,000초

  constructor(
    private readonly redisService: RedisService,
    @InjectRepository(EstateAnalysisReport)
    private readonly analysisReportRepository: Repository<EstateAnalysisReport>,
  ) {}

  /**
   * 주소 기반으로 캐시된 분석 결과를 찾습니다 (Redis 기반)
   * 
   * 검색 전략:
   * 1. 주소 정규화 → Redis 키 생성
   * 2. Redis에서 estateId 조회 (초고속)
   * 3. estateId로 DB에서 분석 결과 조회 (1회만)
   * 4. 만료 기간 체크 (Redis TTL 자동 관리)
   * 
   * Redis 키 구조:
   * - `estate-analysis:by-address:{normalizedAddress}:{userId}` → estateId
   * 
   * @param address 검색할 주소
   * @param userId 사용자 ID (선택)
   * @returns 캐시된 분석 결과 또는 null
   */
  async findCachedAnalysis(
    address: string,
    userId?: number,
  ): Promise<EstateAnalysisReport | null> {
    if (!this.isCacheable(address)) {
      console.log(`[AddressBasedCache-Redis] 캐시 불가능 (주소 너무 짧음): ${address}`);
      return null;
    }

    // 1. Redis 키 생성
    const normalized = normalizeAddress(address);
    const cacheKey = this.getCacheKey(address, userId);
    
    console.log(`[AddressBasedCache-Redis] 🔍 캐시 조회 시작`);
    console.log(`  - 원본 주소: "${address}"`);
    console.log(`  - 정규화 주소: "${normalized}"`);
    console.log(`  - userId: ${userId}`);
    console.log(`  - Redis 키: "${cacheKey}"`);

    try {
      // 2. Redis에서 estateId 조회 (O(1) 초고속)
      const cachedEstateId = await this.redisService.get(cacheKey);

      if (!cachedEstateId) {
        console.log(`[AddressBasedCache-Redis] ❌ 캐시 미스 (Redis에 키 없음)`);
        return null;
      }

      console.log(`  - Redis에서 조회된 estateId: ${cachedEstateId}`);

      // 3. estateId로 분석 결과 조회 (DB 쿼리 1회만)
      const estateId = parseInt(cachedEstateId, 10);
      const analysis = await this.analysisReportRepository.findOne({
        where: { estateId },
      });

      if (!analysis) {
        // Redis에는 있지만 DB에 없는 경우 (드문 경우) → 캐시 무효화
        await this.redisService.del(cacheKey);
        console.log(`[AddressBasedCache-Redis] ❌ 캐시 불일치, 무효화 (DB에 없음)`);
        return null;
      }

      // 4. 유효성 체크 (만료 기간)
      if (!this.isAnalysisValid(analysis)) {
        // 만료된 경우 캐시 무효화
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
   * 분석 결과를 Redis 캐시에 저장합니다
   * 
   * @param address 주소
   * @param userId 사용자 ID
   * @param estateId Estate ID
   */
  async saveCachedAnalysis(
    address: string,
    userId: number,
    estateId: number,
  ): Promise<void> {
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
      // Redis에 estateId 저장 (TTL 90일)
      await this.redisService.set(
        cacheKey,
        estateId.toString(),
        this.CACHE_TTL_SECONDS,
      );

      console.log(`[AddressBasedCache-Redis] ✅ 캐시 저장 완료!`);
    } catch (error) {
      console.error(`[AddressBasedCache-Redis] ❌ 캐시 저장 에러:`, error);
      // 에러 발생 시에도 분석은 계속 진행 (캐시는 선택적 기능)
    }
  }

  /**
   * Redis 캐시 키 생성
   * 
   * @param address 주소
   * @param userId 사용자 ID
   * @returns Redis 키
   */
  private getCacheKey(address: string, userId?: number): string {
    const normalized = normalizeAddress(address);
    const userPart = userId ? `:${userId}` : ':global';
    return `estate-analysis:by-address:${normalized}${userPart}`;
  }

  /**
   * 분석 결과가 유효한지 확인 (만료 기간 체크)
   * 
   * @param analysis 분석 결과
   * @returns 유효 여부
   */
  private isAnalysisValid(analysis: EstateAnalysisReport): boolean {
    if (!analysis.analyzedAt) {
      return false;
    }

    const now = new Date();
    const analyzedDate = new Date(analysis.analyzedAt);
    const daysDiff = Math.floor(
      (now.getTime() - analyzedDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    return daysDiff <= this.MAX_CACHE_AGE_DAYS;
  }

  /**
   * 주소가 캐시 가능한지 확인
   * 
   * @param address 주소
   * @returns 캐시 가능 여부
   */
  isCacheable(address: string): boolean {
    const normalized = normalizeAddress(address);
    return normalized.length >= 5;
  }

  /**
   * 전략 이름 반환
   * 
   * @returns 전략 이름
   */
  getStrategyName(): string {
    return 'AddressBasedCacheStrategy-Redis';
  }
}

