import { CacheInterceptor } from '@nestjs/cache-manager';
import { ExecutionContext, Injectable } from '@nestjs/common';

/**
 * HTTP 응답 캐싱 인터셉터
 * 사용자별 캐시 키 격리로 데이터 보안 보장
 */
@Injectable()
export class HttpCacheInterceptor extends CacheInterceptor {
  /**
   * 캐시 키 생성 로직 (사용자별 격리)
   * @param context 실행 컨텍스트
   * @returns 캐시 키 또는 undefined (캐싱 제외)
   */
  trackBy(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest();
    const { httpAdapter } = this.httpAdapterHost;
    const isHttpApp = httpAdapter && !!httpAdapter.getRequestMethod;
    const cacheMetadata = this.reflector.get(
      'cache_module:cache_ttl',
      context.getHandler(),
    );

    // 목적: HTTP 애플리케이션 여부 및 캐시 메타데이터 확인
    if (!isHttpApp || cacheMetadata) {
      // @CacheTTL 데코레이터 또는 @UseInterceptors로 명시적 캐싱 설정
    }

    // 목적: HTTP 애플리케이션이 아닌 경우 캐싱 제외
    if (!isHttpApp) {
      return undefined;
    }

    const url = httpAdapter.getRequestUrl(request);
    const user = request.user;
    
    // 목적: 사용자별 캐시 격리 (개인정보 보호)
    if (user && user.userId) {
      return `${user.userId}:${url}`;
    }

    // 목적: 인증되지 않은 경우 URL만으로 캐시 키 생성
    return url;
  }
}
