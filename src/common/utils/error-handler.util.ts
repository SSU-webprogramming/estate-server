import { CustomException } from '@/common/errors/custom-exception';
import { ErrorCode } from '@/common/errors/error';
import { Logger } from '@nestjs/common';

/**
 * 공통 에러 처리 유틸리티
 */
export class ErrorHandler {
  /**
   * 데이터베이스 작업에서 발생하는 에러를 처리합니다.
   * TypeORM 에러는 GlobalExceptionFilter에서 처리되므로,
   * 여기서는 추가적인 로깅만 수행합니다.
   */
  static async handleDatabaseOperation<T>(
    operation: () => Promise<T>,
    context: string,
    logger?: Logger,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (logger) {
        logger.error(`${context}에서 데이터베이스 작업 실패:`, error);
      }
      throw error; // GlobalExceptionFilter에서 처리하도록 재던짐
    }
  }

  /**
   * 외부 API 호출에서 발생하는 에러를 처리합니다.
   */
  static async handleApiCall<T>(
    operation: () => Promise<T>,
    errorCode: ErrorCode,
    context: string,
    logger?: Logger,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (logger) {
        logger.error(`${context}에서 API 호출 실패:`, error);
      }
      throw new CustomException(errorCode, `${context} 실패`);
    }
  }

  /**
   * JSON 파싱에서 발생하는 에러를 처리합니다.
   */
  static parseJson<T = any>(jsonString: string, defaultValue?: T): T {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('JSON 파싱 실패:', error);
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      throw new CustomException(ErrorCode.INVALID_INPUT_VALUE, '잘못된 JSON 형식입니다.');
    }
  }

  /**
   * 배치 작업에서 개별 항목 처리 실패를 무시하고 계속 진행합니다.
   * S3 파일 삭제, 캐시 정리 등의 작업에 적합합니다.
   */
  static async handleBatchOperation<T>(
    items: T[],
    operation: (item: T) => Promise<void>,
    operationName: string,
    logger?: Logger,
  ): Promise<{ successCount: number; failureCount: number }> {
    let successCount = 0;
    let failureCount = 0;

    for (const item of items) {
      try {
        await operation(item);
        successCount++;
      } catch (error) {
        failureCount++;
        if (logger) {
          logger.error(`${operationName} 실패 (항목: ${JSON.stringify(item)}):`, error);
        } else {
          console.error(`${operationName} 실패:`, error);
        }
      }
    }

    return { successCount, failureCount };
  }

  /**
   * 파일 업로드/다운로드 작업에서 발생하는 에러를 처리합니다.
   */
  static async handleFileOperation<T>(
    operation: () => Promise<T>,
    errorCode: ErrorCode,
    context: string,
    logger?: Logger,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (logger) {
        logger.error(`${context}에서 파일 작업 실패:`, error);
      }
      throw new CustomException(errorCode, `${context} 실패`);
    }
  }

  /**
   * 캐시 작업에서 발생하는 에러를 처리합니다.
   */
  static async handleCacheOperation<T>(
    operation: () => Promise<T>,
    context: string,
    logger?: Logger,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (logger) {
        logger.error(`${context}에서 캐시 작업 실패:`, error);
      }
      throw new CustomException(ErrorCode.CACHE_ERROR, `${context} 실패`);
    }
  }

  /**
   * Redis 작업에서 발생하는 에러를 처리합니다.
   */
  static async handleRedisOperation<T>(
    operation: () => Promise<T>,
    context: string,
    logger?: Logger,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (logger) {
        logger.error(`${context}에서 Redis 작업 실패:`, error);
      }
      throw new CustomException(ErrorCode.REDIS_CONNECTION_ERROR, `${context} 실패`);
    }
  }
}
