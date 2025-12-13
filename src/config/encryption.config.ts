import { registerAs } from '@nestjs/config';

/**
 * 암호화 설정
 * 
 * 민감정보 암호화에 사용되는 설정을 관리합니다.
 * 환경변수에서 암호화 키를 로딩하며, 키가 없는 경우 애플리케이션 시작 시 에러를 발생시킵니다.
 */
export default registerAs('encryption', () => ({
  /**
   * 데이터 암호화 키
   * - AES-256-GCM 알고리즘 사용
   * - 최소 32자 이상의 복잡한 문자열 권장
   * - 개발/운영 환경별로 다른 키 사용 필수
   */
  key: process.env.ENCRYPTION_KEY,

  /**
   * 암호화 알고리즘
   */
  algorithm: 'aes-256-gcm' as const,

  /**
   * 암호화 활성화 여부
   * - 테스트 환경에서는 비활성화 가능
   * - 운영 환경에서는 반드시 활성화
   */
  enabled: process.env.ENCRYPTION_ENABLED !== 'false',
}));

