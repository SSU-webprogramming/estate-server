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

  setupSecurity(app);
  setupCors(app);
  setupValidation(app);
  setupSwagger(app);

  await app.listen(3000);
}

function setupSecurity(app: NestExpressApplication): void {
  app.use(helmet());
  app.useBodyParser('json', { limit: '10mb' });
  app.useBodyParser('urlencoded', { limit: '10mb', extended: true });
  
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);
  
  app.use(compression());
}

function setupCors(app: NestExpressApplication): void {
  const allowedOrigins = getAllowedOrigins();

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Authorization'],
  });
}

function getAllowedOrigins(): string[] {
  return process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL?.split(',') || []
    : ['http://localhost:3001', 'http://localhost:3000'];
}

function setupValidation(app: NestExpressApplication): void {
  app.useGlobalPipes(
    new SanitizeInputPipe(),
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
}

function setupSwagger(app: NestExpressApplication): void {
  const config = new DocumentBuilder()
    .setTitle('SSU 고급웹프로그래밍 부동산 프로젝트 서버')
    .setDescription('SSU 고급웹프로그래밍 부동산 프로젝트 서버 api 문서')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
    
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
}

bootstrap();
