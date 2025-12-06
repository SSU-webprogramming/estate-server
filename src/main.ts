import { NestFactory } from '@nestjs/core';
import { AppModule } from '@/app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { SanitizeInputPipe } from '@/common/pipes/sanitize-input.pipe';

import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 1. Security: Helmet (HTTP Headers)
  app.use(helmet());

  // 1.1 Security: Body Size Limits (DoS Prevention)
  app.useBodyParser('json', { limit: '10mb' });
  app.useBodyParser('urlencoded', { limit: '10mb', extended: true });

  // 1.2 Security: Trust Proxy (for correct IP behind load balancer/proxy)
  // NestJS ExpressAdapter uses 'trust proxy' setting from Express
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1); // Trust first proxy

  // 2. Performance: Compression (Gzip)
  app.use(compression());

  // 3. Security: CORS
  app.enableCors({
    origin: true, // 개발 환경 편의상 true, 운영 시 특정 도메인 지정 필요
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(
    new SanitizeInputPipe(), // 4. Security: XSS/HTML Sanitization
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('SSU 고급웹프로그래밍 부동산 프로젝트(가제) 서버')
    .setDescription('SSU 고급웹프로그래밍 부동산 프로젝트(가제) 서버 api 문서')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
bootstrap();
