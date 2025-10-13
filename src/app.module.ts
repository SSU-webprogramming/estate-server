import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER } from '@nestjs/core';

// Common Modules
import { LoggerModule } from './common/logger/logger.module';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { LoggerMiddleware } from './common/middleware/logger.middleware';

// Feature Modules
import { UserModule } from './modules/user/user.module';
import { DocumentAnalyzerModule } from './modules/document-analyzer/document-analyzer.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { DocumentModule } from './modules/document/document.module';
import { RedisModule } from './modules/redis/redis.module';

// Config
import { getTypeOrmConfig } from './config/typeorm.config';
import redisConfig from './config/redis.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [redisConfig],
    }),
    LoggerModule, // Winston log
    RedisModule.register(),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getTypeOrmConfig,
    }),

    HealthModule,
    UserModule,
    DocumentAnalyzerModule,
    AuthModule,
    DocumentModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
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
