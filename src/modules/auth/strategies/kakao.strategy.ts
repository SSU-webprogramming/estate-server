import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-kakao';
import { ConfigService } from '@nestjs/config';
import { CustomException } from '@/common/errors/custom-exception';
import { ErrorCode } from '@/common/errors/error';
import { AuthService } from '@/modules/auth/services/auth.service';
import { ProviderType } from '@/common/enums/provider-type.enum';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const clientID = configService.get<string>('KAKAO_CLIENT_ID');
    const clientSecret = configService.get<string>('KAKAO_CLIENT_SECRET');

    if (!clientID || !clientSecret) {
      throw new CustomException(ErrorCode.KAKAO_VAL_NOT_FOUND);
    }

    super({
      clientID,
      clientSecret,
      callbackURL: '/auth/kakao/callback',
    } as any);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any,
  ) {
    // Step 1: 카카오 프로필에서 사용자 정보 추출
    const { id, username, _json } = profile;
    const email = _json?.kakao_account?.email;

    // Step 2: 카카오 사용자 ID 누락 시 에러 처리
    if (!id) {
      return done(new Error('Kakao profile did not return a user ID.'), null);
    }
    
    // Step 3: 기존 사용자 조회 또는 신규 사용자 정보 생성
    const user = await this.authService.validateUser(
      ProviderType.KAKAO,
      id.toString(),
      username,
      email,
    );
    
    // Step 4: 사용자 정보를 req.user에 할당
    done(null, user);
  }
}
