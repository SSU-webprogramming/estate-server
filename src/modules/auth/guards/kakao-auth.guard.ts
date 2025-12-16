import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * 카카오 OAuth 인증 가드
 * - 카카오 인증 페이지로 리다이렉트 또는 콜백 처리
 * - KakaoStrategy.validate() 메서드를 자동 실행
 * - 검증 성공 시 req.user에 사용자 정보 할당
 */
@Injectable()
export class KakaoAuthGuard extends AuthGuard('kakao') {}