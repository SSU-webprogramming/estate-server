import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { CustomException } from '@/common/errors/custom-exception';
import { ErrorCode } from '@/common/errors/error';
import { User } from '@/modules/user/entities/user.entity';
import { UserRepository } from '@/modules/user/repositories/user.repository';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
  ) {
    const secret = configService.get<string>('JWT_SECRET');

    if (!secret) {
      throw new CustomException(ErrorCode.TOKEN_NOT_FOUND);
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    } as any);
  }

  async validate(payload: any): Promise<User> {
    // Step 1: JWT 페이로드에서 userId 추출 (payload.sub)
    // Step 2: DB에서 사용자 조회
    const user = await this.userRepository.findOne(payload.sub);

    // Step 3: 사용자가 없으면 예외 발생 (탈퇴 또는 미존재)
    if (!user) {
      throw new CustomException(ErrorCode.USER_NOT_FOUND);
    }

    // Step 4: 사용자 Entity 반환 (req.user에 자동 할당)
    return user;
  }
}
