import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError, TypeORMError } from 'typeorm';
import { CustomException } from '@/common/errors/custom-exception';
import { ErrorCode } from '@/common/errors/error';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode: number;
    let errorCode: ErrorCode;
    let error: string;
    let message: string;

    if (exception instanceof CustomException) {
      statusCode = exception.getStatus();
      const errorResponse = exception.getResponse() as {
        errorCode: ErrorCode;
        message: string;
      };
      errorCode = errorResponse.errorCode;
      error = exception.constructor.name;
      message = errorResponse.message;
    } else if (exception instanceof BadRequestException) {
      statusCode = exception.getStatus();
      const errorResponse = exception.getResponse();
      errorCode = ErrorCode.INVALID_INPUT_VALUE;
      error = 'ValidationError';

      // ValidationPipe 에러인 경우 상세한 메시지 추출
      if (typeof errorResponse === 'object' && errorResponse !== null) {
        const response = errorResponse as any;
        if (response.message && Array.isArray(response.message)) {
          message = response.message.join(', ');
        } else if (response.message) {
          message = response.message;
        } else {
          message = '입력값 검증에 실패했습니다.';
        }
      } else {
        message = exception.message || '입력값 검증에 실패했습니다.';
      }
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const errorResponse = exception.getResponse();
      errorCode = ErrorCode.INVALID_INPUT_VALUE;
      error = (errorResponse as any).error || exception.constructor.name;
      message = (errorResponse as any).message || exception.message;
    } else if (exception instanceof QueryFailedError) {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = ErrorCode.QUERY_FAILED;
      error = 'DatabaseError';
      message = '데이터 처리 중 오류가 발생했습니다.';
    } else if (exception instanceof TypeORMError) {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = ErrorCode.DATABASE_ERROR;
      error = 'DatabaseError';
      message = '데이터베이스 연동 중 오류가 발생했습니다.';
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
      error = 'InternalServerError';
      message = '서버 내부 오류가 발생했습니다. 관리자에게 문의해주세요.';
      console.log(exception);
      console.log(statusCode);
      console.log(errorCode);
      console.log(error);
      console.log(message);
    }

    const errorResponsePayload = {
      statusCode,
      errorCode,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    const { message: _, ...payload } = errorResponsePayload;
    this.logger.error(message, {
      ...payload,
      stack: (exception as any).stack,
      context: GlobalExceptionFilter.name,
    });

    response.status(statusCode).json(errorResponsePayload);
  }
}
