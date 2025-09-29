import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError, TypeORMError } from 'typeorm';
import { CustomException } from '../errors/custom-exception';
import { ErrorCode } from '../errors/error';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
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
      const errorResponse = exception.getResponse() as { errorCode: ErrorCode; message: string };
      errorCode = errorResponse.errorCode;
      error = exception.constructor.name;
      message = errorResponse.message;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const errorResponse = exception.getResponse();
      errorCode = ErrorCode.INVALID_INPUT_VALUE; // 기본값 설정
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
    }

    const errorResponsePayload = {
      statusCode,
      errorCode,
      error,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    console.error(
      `[GlobalExceptionFilter] ${new Date().toISOString()} | ${request.method} ${request.url}`,
      `\n- Status: ${statusCode}`,
      `\n- ErrorCode: ${errorCode}`,
      `\n- Error: ${error}`,
      `\n- Message: ${message}`,
      `\n- Exception:`,
      exception,
    );

    // Sentry.captureException(exception);

    response.status(statusCode).json(errorResponsePayload);
  }
}
