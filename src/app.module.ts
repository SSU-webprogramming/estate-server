import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

// Common Modules
import { LoggerModule } from '@/common/logger/logger.module';
import { GlobalExceptionFilter } from '@/common/filters/http-exception.filter';
import { LoggerMiddleware } from '@/common/middleware/logger.middleware';

// Feature Modules
import { UserModule } from '@/modules/user/user.module';
import { EstateAnalysisReportModule } from '@/modules/estate-analysis-report/estate-analysis-report.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { HealthModule } from '@/modules/health/health.module';
import { DocumentModule } from '@/modules/document/document.module';
import { EstateModule } from '@/modules/estate/estate.module';
import { RedisModule } from '@/modules/redis/redis.module';
import { TermModule } from '@/modules/term/term.module';

// Config
import { getTypeOrmConfig } from '@/config/typeorm.config';
import redisConfig from '@/config/redis.config';
import encryptionConfig from '@/config/encryption.config';
import { validate } from '@/config/env.validation';
import { HttpClientModule } from '@/common/http/http-client.module';
import { CacheModule } from '@/common/cache/cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [redisConfig, encryptionConfig],
      validate,
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: 60000,
          limit: 100,
        },
      ],
    }),
    LoggerModule,
    RedisModule.register(),
    HttpClientModule,
    CacheModule,

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getTypeOrmConfig,
    }),

    HealthModule,
    UserModule,
    EstateAnalysisReportModule,
    AuthModule,
    DocumentModule,
    EstateModule,
    TermModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // health api 제외 모든 요청 로깅
    consumer
      .apply(LoggerMiddleware)
      .exclude({ path: '/health', method: RequestMethod.GET })
      .forRoutes('*');
  }
}
