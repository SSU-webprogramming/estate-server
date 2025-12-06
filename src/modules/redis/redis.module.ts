import { Module, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';

@Module({})
export class RedisModule {
  static register(): DynamicModule {
    const redisProvider = {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        return new Redis({
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
        });
      },
      inject: [ConfigService],
    };

    return {
      module: RedisModule,
      imports: [ConfigModule],
      providers: [redisProvider, RedisService],
      exports: [RedisService],
    };
  }
}
