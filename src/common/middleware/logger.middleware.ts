import { Injectable, NestMiddleware, Inject } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  use(req: Request, res: Response, next: NextFunction) {
    const { ip, method, originalUrl, body, headers } = req;
    const userAgent = headers['user-agent'] || '';
    const startTime = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - startTime;

      const maskedBody = { ...body };
      const sensitiveFields = ['password', 'token', 'secret', 'refreshToken'];
      sensitiveFields.forEach((field) => {
        if (maskedBody[field]) maskedBody[field] = '***';
      });

      this.logger.info(
        `[${method}] ${originalUrl} ${statusCode} - ${duration}ms - ${ip} - ${userAgent}`,
        { 
          context: 'HTTP',
          body: JSON.stringify(maskedBody),
        },
      );
    });

    next();
  }
}
