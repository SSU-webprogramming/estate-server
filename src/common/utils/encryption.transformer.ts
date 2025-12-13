import { ValueTransformer } from 'typeorm';
import * as crypto from 'crypto';
import { CustomException } from '@/common/errors/custom-exception';
import { ErrorCode } from '@/common/errors/error';

/**
 * AES-256-GCM 암호화 ValueTransformer
 * 
 * TypeORM의 ValueTransformer를 사용하여 엔티티 레벨에서 자동으로 암호화/복호화를 수행합니다.
 * 데이터베이스에 저장될 때 자동으로 암호화되고, 조회 시 자동으로 복호화됩니다.
 * 
 * 보안 고려사항:
 * - 암호화 키는 반드시 환경변수로 관리
 * - IV(Initialization Vector)는 매번 랜덤 생성
 * - Auth Tag를 사용하여 데이터 무결성 검증
 * - 에러 로그에 민감정보 절대 출력 금지
 */
export class EncryptionTransformer implements ValueTransformer {
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 16; // 128 bits
  private readonly authTagLength = 16; // 128 bits
  private readonly encoding: BufferEncoding = 'hex';
  private key: Buffer | null = null;

  /**
   * 암호화 키를 lazy하게 가져오고 검증합니다.
   * 엔티티 로드 시점이 아닌 실제 사용 시점에 키를 가져옵니다.
   */
  private getEncryptionKey(): Buffer {
    if (this.key) {
      return this.key;
    }

    const encryptionKey = process.env.ENCRYPTION_KEY;
    
    if (!encryptionKey || encryptionKey.trim().length === 0) {
      throw new CustomException(
        ErrorCode.INTERNAL_SERVER_ERROR,
        '암호화 키가 설정되지 않았습니다. ENCRYPTION_KEY 환경변수를 확인하세요.',
      );
    }

    if (encryptionKey.length < 32) {
      throw new CustomException(
        ErrorCode.INTERNAL_SERVER_ERROR,
        '암호화 키는 최소 32자 이상이어야 합니다.',
      );
    }

    // 키를 32 bytes로 정규화 (SHA-256 해시 사용)
    this.key = crypto.createHash('sha256').update(encryptionKey).digest();
    return this.key;
  }

  /**
   * 데이터베이스에 저장하기 전 암호화 수행
   * 
   * @param value 원본 데이터
   * @returns 암호화된 데이터 (hex 인코딩)
   * 
   * 암호화 형식: iv:authTag:encryptedData (각각 hex 인코딩)
   */
  to(value: string | null): string | null {
    // null이거나 undefined인 경우 암호화하지 않음
    if (value === null || value === undefined) {
      return null;
    }

    // 빈 문자열인 경우도 null로 처리
    if (typeof value === 'string' && value.trim() === '') {
      return null;
    }

    try {
      const key = this.getEncryptionKey();
      
      // 랜덤 IV 생성 (매번 다른 IV를 사용하여 동일한 평문도 다른 암호문 생성)
      const iv = crypto.randomBytes(this.ivLength);
      
      // 암호화 객체 생성
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      // 데이터 암호화
      let encrypted = cipher.update(value, 'utf8', this.encoding);
      encrypted += cipher.final(this.encoding);

      // Auth Tag 추출 (데이터 무결성 검증용)
      const authTag = cipher.getAuthTag();

      // 형식: iv:authTag:encryptedData
      return `${iv.toString(this.encoding)}:${authTag.toString(this.encoding)}:${encrypted}`;
    } catch (error) {
      // 에러 로그에 민감정보가 포함되지 않도록 주의
      throw new CustomException(
        ErrorCode.INTERNAL_SERVER_ERROR,
        '데이터 암호화에 실패했습니다.',
      );
    }
  }

  /**
   * 데이터베이스에서 조회 후 복호화 수행
   * 
   * @param value 암호화된 데이터
   * @returns 복호화된 원본 데이터
   */
  from(value: string | null): string | null {
    // null이거나 undefined인 경우 복호화하지 않음
    if (value === null || value === undefined) {
      return null;
    }

    // 빈 문자열인 경우도 null로 처리
    if (typeof value === 'string' && value.trim() === '') {
      return null;
    }

    try {
      const key = this.getEncryptionKey();
      
      // 암호화된 데이터 파싱: iv:authTag:encryptedData
      const parts = value.split(':');
      
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const [ivHex, authTagHex, encryptedData] = parts;

      // hex를 Buffer로 변환
      const iv = Buffer.from(ivHex, this.encoding);
      const authTag = Buffer.from(authTagHex, this.encoding);

      // 복호화 객체 생성
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      // 데이터 복호화
      let decrypted = decipher.update(encryptedData, this.encoding, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      // 복호화 실패 시 민감정보가 포함되지 않도록 주의
      throw new CustomException(
        ErrorCode.INTERNAL_SERVER_ERROR,
        '데이터 복호화에 실패했습니다.',
      );
    }
  }
}

/**
 * 암호화 Transformer 싱글톤 인스턴스
 * 
 * 환경변수에서 lazy하게 암호화 키를 가져오므로,
 * 엔티티 로드 시점이 아닌 실제 사용 시점에 키를 검증합니다.
 */
let transformerInstance: EncryptionTransformer | null = null;

export function getEncryptionTransformer(): EncryptionTransformer {
  if (!transformerInstance) {
    transformerInstance = new EncryptionTransformer();
  }
  return transformerInstance;
}

