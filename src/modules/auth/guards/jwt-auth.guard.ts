import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT 인증 가드
 * - Authorization Header의 Bearer Token을 검증
 * - JwtStrategy.validate() 메서드를 자동 실행
 * - 검증 성공 시 req.user에 사용자 정보 할당
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}