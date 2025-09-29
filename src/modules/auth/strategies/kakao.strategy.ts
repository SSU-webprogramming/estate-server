import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-kakao';
import { ConfigService } from '@nestjs/config';
import { CustomException } from 'src/common/errors/custom-exception';
import { ErrorCode } from 'src/common/errors/error';
import { AuthService } from '../services/auth.service';

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
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: any) {
    // For debugging purposes, you can log the profile object
    console.log('Kakao Profile:', JSON.stringify(profile, null, 2));

    const { id, username, _json } = profile;
    const email = _json?.kakao_account?.email; // Safely access email

    if (!id) {
      // If for some reason ID is not present, fail the authentication
      return done(new Error('Kakao profile did not return a user ID.'), null);
    }

    const user = await this.authService.validateUser(
      'kakao',
      id.toString(),
      username,
      email, // email can be undefined if user did not consent
    );

    done(null, user);
  }
}
