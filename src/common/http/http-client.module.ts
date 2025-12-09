import { Module, OnModuleInit, Global } from '@nestjs/common';
import { HttpModule, HttpService } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import axiosRetry from 'axios-retry';

@Global()
@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        timeout: configService.get('HTTP_TIMEOUT', 5000),
        maxRedirects: 5,
      }),
      inject: [ConfigService],
    }),
  ],
  exports: [HttpModule],
})
export class HttpClientModule implements OnModuleInit {
  constructor(private readonly httpService: HttpService) {}

  onModuleInit() {
    const axios = this.httpService.axiosRef;
    axiosRetry(axios, {
      retries: 3,
      retryDelay: axiosRetry.exponentialDelay,
      retryCondition: (error) => {
        return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 429;
      },
    });
  }
}
