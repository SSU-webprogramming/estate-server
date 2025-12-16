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

    const { statusCode, errorCode, error, message } = this.extractErrorInfo(exception);
    const errorResponsePayload = this.buildErrorResponse(statusCode, errorCode, error, message, request.url);

    this.logError(message, errorResponsePayload, exception);
    response.status(statusCode).json(errorResponsePayload);
  }

  private extractErrorInfo(exception: unknown): {
    statusCode: number;
    errorCode: ErrorCode;
    error: string;
    message: string;
  } {
    if (exception instanceof CustomException) {
      return this.handleCustomException(exception);
    }
    if (exception instanceof BadRequestException) {
      return this.handleBadRequestException(exception);
    }
    if (exception instanceof HttpException) {
      return this.handleHttpException(exception);
    }
    if (exception instanceof QueryFailedError) {
      return this.handleQueryFailedError();
    }
    if (exception instanceof TypeORMError) {
      return this.handleTypeORMError();
    }
    
    return this.handleUnknownError();
  }

  private handleCustomException(exception: CustomException): {
    statusCode: number;
    errorCode: ErrorCode;
    error: string;
    message: string;
  } {
    const statusCode = exception.getStatus();
    const errorResponse = exception.getResponse() as {
      errorCode: ErrorCode;
      message: string;
    };
    return {
      statusCode,
      errorCode: errorResponse.errorCode,
      error: exception.constructor.name,
      message: errorResponse.message,
    };
  }

  private handleBadRequestException(exception: BadRequestException): {
    statusCode: number;
    errorCode: ErrorCode;
    error: string;
    message: string;
  } {
    const errorResponse = exception.getResponse();
    const message = this.extractValidationMessage(errorResponse, exception.message);
    
    return {
      statusCode: exception.getStatus(),
      errorCode: ErrorCode.INVALID_INPUT_VALUE,
      error: 'ValidationError',
      message,
    };
  }

  private extractValidationMessage(errorResponse: any, defaultMessage: string): string {
    if (typeof errorResponse === 'object' && errorResponse !== null) {
      if (errorResponse.message && Array.isArray(errorResponse.message)) {
        return errorResponse.message.join(', ');
      }
      if (errorResponse.message) {
        return errorResponse.message;
      }
    }
    return defaultMessage || '입력값 검증에 실패했습니다.';
  }

  private handleHttpException(exception: HttpException): {
    statusCode: number;
    errorCode: ErrorCode;
    error: string;
    message: string;
  } {
    const errorResponse = exception.getResponse();
    return {
      statusCode: exception.getStatus(),
      errorCode: ErrorCode.INVALID_INPUT_VALUE,
      error: (errorResponse as any).error || exception.constructor.name,
      message: (errorResponse as any).message || exception.message,
    };
  }

  private handleQueryFailedError(): {
    statusCode: number;
    errorCode: ErrorCode;
    error: string;
    message: string;
  } {
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: ErrorCode.QUERY_FAILED,
      error: 'DatabaseError',
      message: '데이터 처리 중 오류가 발생했습니다.',
    };
  }

  private handleTypeORMError(): {
    statusCode: number;
    errorCode: ErrorCode;
    error: string;
    message: string;
  } {
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: ErrorCode.DATABASE_ERROR,
      error: 'DatabaseError',
      message: '데이터베이스 연동 중 오류가 발생했습니다.',
    };
  }

  private handleUnknownError(): {
    statusCode: number;
    errorCode: ErrorCode;
    error: string;
    message: string;
  } {
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
      error: 'InternalServerError',
      message: '서버 내부 오류가 발생했습니다. 관리자에게 문의해주세요.',
    };
  }

  private buildErrorResponse(
    statusCode: number,
    errorCode: ErrorCode,
    error: string,
    message: string,
    path: string,
  ): any {
    return {
      statusCode,
      errorCode,
      error,
      message,
      timestamp: new Date().toISOString(),
      path,
    };
  }

  private logError(message: string, payload: any, exception: unknown): void {
    const { message: _, ...logPayload } = payload;
    this.logger.error(message, {
      ...logPayload,
      stack: (exception as any).stack,
      context: GlobalExceptionFilter.name,
    });
  }
}