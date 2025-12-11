import { EstateAnalysisReport } from '@/modules/estate-analysis-report/entities/estate-analysis-report.entity';

/**
 * 분석 캐싱 전략 인터페이스 토큰
 */
export const ANALYSIS_CACHE_STRATEGY_PORT = 'ANALYSIS_CACHE_STRATEGY_PORT';

/**
 * 분석 캐싱 전략 인터페이스 (Port)
 * 
 * 의존성 역전 원칙(DIP): 상위 모듈이 하위 모듈의 구체적 구현에 의존하지 않고 추상화에 의존
 * 다양한 캐싱 전략(주소 기반, 문서 해시 기반 등)을 교체 가능하도록 설계
 */
export interface AnalysisCacheStrategyPort {
  /**
   * 캐시된 분석 결과를 찾습니다
   * 
   * @param address 주소
   * @param userId 사용자 ID
   * @returns 캐시된 분석 결과 또는 null
   */
  findCachedAnalysis(
    address: string,
    userId?: number,
  ): Promise<EstateAnalysisReport | null>;

  /**
   * 분석 결과를 캐시에 저장합니다
   * 
   * @param address 주소
   * @param userId 사용자 ID
   * @param estateId Estate ID
   */
  saveCachedAnalysis(
    address: string,
    userId: number,
    estateId: number,
  ): Promise<void>;

  /**
   * 캐시 가능 여부를 확인합니다
   * 
   * @param address 주소
   * @returns 캐시 가능 여부
   */
  isCacheable(address: string): boolean;

  /**
   * 캐시 전략 이름을 반환합니다
   * 
   * @returns 전략 이름
   */
  getStrategyName(): string;
}

/**
 * 캐싱 결과 메타데이터
 */
export interface CacheMetadata {
  /** 캐시 히트 여부 */
  isHit: boolean;
  /** 원본 Estate ID */
  sourceEstateId?: number;
  /** 캐시 전략 이름 */
  strategyName: string;
  /** 주소 유사도 (0~1) */
  similarity?: number;
}

