import { CacheInterceptor } from '@nestjs/cache-manager';
import { ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class HttpCacheInterceptor extends CacheInterceptor {
  trackBy(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest();
    const { httpAdapter } = this.httpAdapterHost;
    const isHttpApp = httpAdapter && !!httpAdapter.getRequestMethod;
    const cacheMetadata = this.reflector.get(
      'cache_module:cache_ttl',
      context.getHandler(),
    );

    if (!isHttpApp || cacheMetadata) {
      // Require explicit @CacheTTL or similar metadata to cache
      // Or just rely on the fact that we put @UseInterceptors on the method
    }

    if (!isHttpApp) {
      return undefined;
    }

    const url = httpAdapter.getRequestUrl(request);
    const user = request.user;
    
    // If user is authenticated, include userId in the cache key
    if (user && user.userId) {
      return `${user.userId}:${url}`;
    }

    // Fallback to default behavior (URL only) or return undefined to skip caching if no user
    // Given this is a user-specific API, we probably shouldn't cache if no user, but the guard ensures user.
    return url;
  }
}
