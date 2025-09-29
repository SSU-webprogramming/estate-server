import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-kakao';
import { ConfigService } from '@nestjs/config';
import { CustomException } from 'src/common/errors/custom-exception';
import { ErrorCode } from 'src/common/errors/error';

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(private readonly configService: ConfigService) {
    const clientID = configService.get<string>('KAKAO_CLIENT_ID');
    const clientSecret = configService.get<string>('KAKAO_CLIENT_SECRET');

    if (!clientID || !clientSecret) {
      throw new CustomException(ErrorCode.KAKAO_VAL_NOT_FOUND);
    }

    super({
      clientID,
      clientSecret,
      callbackURL: '/auth/kakao/callback',
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: any) {
    const {
      id,
      username,
      _json: { kakao_account },
    } = profile;

    const user = {
      provider: 'kakao',
      providerId: id,
      username: username,
      email: kakao_account.email,
    };

    done(null, user);
  }
}
