import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { transports, format } from 'winston';
import winstonDaily from 'winston-daily-rotate-file';

const { combine, timestamp, printf, colorize } = format;

const logFormat = printf((info) => {
  return `${info.timestamp} [${info.level}] ${info.context}: ${info.message}`;
});

@Module({
  imports: [
    WinstonModule.forRoot({
      transports: [
        new transports.Console({
          level: process.env.NODE_ENV === 'production' ? 'info' : 'silly',
          format: combine(
            colorize(),
            timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            logFormat,
          ),
        }),
        new winstonDaily({
          level: 'info',
          datePattern: 'YYYY-MM-DD',
          dirname: 'logs',
          filename: `%DATE%.log`,
          maxFiles: 30,
          zippedArchive: true,
          format: combine(
            timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            logFormat,
          ),
        }),
        new winstonDaily({
          level: 'error',
          datePattern: 'YYYY-MM-DD',
          dirname: 'logs/error',
          filename: `%DATE%.error.log`,
          maxFiles: 30,
          zippedArchive: true,
          format: combine(
            timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            logFormat,
          ),
        }),
      ],
    }),
  ],
})
export class LoggerModule {}
