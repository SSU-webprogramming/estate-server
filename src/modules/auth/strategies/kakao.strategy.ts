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
    const backendUrl = configService.get<string>('BACKEND_URL') || 'http://localhost:3000';

    if (!clientID || !clientSecret) {
      throw new CustomException(ErrorCode.KAKAO_VAL_NOT_FOUND);
    }

    super({
      clientID,
      clientSecret,
      callbackURL: `${backendUrl}/auth/kakao/callback`,
    } as any);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: any,
  ) {
    const { id, username, _json } = profile;
    const email = _json?.kakao_account?.email;

    if (!id) {
      return done(new Error('Kakao profile did not return a user ID.'), null);
    }
    const user = await this.authService.validateUser(
      ProviderType.KAKAO,
      id.toString(),
      username,
      email,
    );
    done(null, user);
  }
}
