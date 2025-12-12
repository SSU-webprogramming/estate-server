import { DataSource, QueryRunner } from 'typeorm';
import { Logger } from '@nestjs/common';

/**
 * 트랜잭션 처리 유틸리티
 * 반복적인 트랜잭션 코드를 공통화하여 관리합니다.
 */
export class TransactionHelper {
  /**
   * 트랜잭션 내에서 작업을 실행합니다.
   * 
   * @param dataSource TypeORM DataSource 객체
   * @param operation 트랜잭션 내에서 실행할 작업
   * @param context 로깅을 위한 컨텍스트 정보
   * @param logger 선택적 Logger 객체
   * @returns 작업 결과
   * 
   * @example
   * await TransactionHelper.runInTransaction(
   *   this.dataSource,
   *   async (queryRunner) => {
   *     await queryRunner.manager.softDelete(User, { userId });
   *   },
   *   '사용자 삭제'
   * );
   */
  static async runInTransaction<T>(
    dataSource: DataSource,
    operation: (queryRunner: QueryRunner) => Promise<T>,
    context?: string,
    logger?: Logger,
  ): Promise<T> {
    const queryRunner = dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await operation(queryRunner);
      await queryRunner.commitTransaction();

      if (logger && context) {
        logger.log(`${context} 트랜잭션 성공`);
      }

      return result;
    } catch (error) {
      await queryRunner.rollbackTransaction();

      if (logger && context) {
        logger.error(`${context} 트랜잭션 실패:`, error);
      }

      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 여러 작업을 순차적으로 트랜잭션 내에서 실행합니다.
   * 
   * @param dataSource TypeORM DataSource 객체
   * @param operations 순차적으로 실행할 작업 배열
   * @param context 로깅을 위한 컨텍스트 정보
   * @param logger 선택적 Logger 객체
   * 
   * @example
   * await TransactionHelper.runSequentialInTransaction(
   *   this.dataSource,
   *   [
   *     (qr) => qr.manager.softDelete(Document, { userId }),
   *     (qr) => qr.manager.softDelete(Estate, { userId }),
   *     (qr) => qr.manager.softDelete(User, { userId }),
   *   ],
   *   '사용자 및 관련 데이터 삭제'
   * );
   */
  static async runSequentialInTransaction(
    dataSource: DataSource,
    operations: Array<(queryRunner: QueryRunner) => Promise<void>>,
    context?: string,
    logger?: Logger,
  ): Promise<void> {
    await this.runInTransaction(
      dataSource,
      async (queryRunner) => {
        for (const operation of operations) {
          await operation(queryRunner);
        }
      },
      context,
      logger,
    );
  }
}

