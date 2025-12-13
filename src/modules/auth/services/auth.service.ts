import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '@/modules/user/entities/user.entity';
import { ProviderType } from '@/common/enums/provider-type.enum';
import { RedisService } from '@/modules/redis/redis.service';
import { CustomException } from '@/common/errors/custom-exception';
import { ErrorCode } from '@/common/errors/error';
import { RefreshTokenDto } from '@/modules/auth/dto/request/refresh-token.dto';
import { KakaoRegisterInfo } from '@/modules/auth/interfaces/request-with-user.interface';
import { UserRepository } from '@/modules/user/repositories/user.repository';
import { UserMapper } from '@/modules/user/mapper/user.mapper';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async validateUser(
    providerType: ProviderType,
    providerId: string,
    username: string,
    email: string,
  ): Promise<User | KakaoRegisterInfo> {
    let user = await this.userRepository.findByProvider(providerType, providerId);

    if (user) {
      return user;
    }

    user = await this.userRepository.findByEmail(email);
    
    return {
      providerType,
      providerId,
      username,
      email,
    };
  }

  async login(user: User) {
    const payload = { username: user.username, sub: user.userId };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION_TIME'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRATION_TIME'),
      }),
    ]);

    const refreshTokenTTL = this.configService.get<number>('JWT_REFRESH_TOKEN_EXPIRATION_TIME_TTL');
    await this.redisService.set(`refresh_token:${user.userId}`, refreshToken, refreshTokenTTL);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async refreshTokens(refreshTokenDto: RefreshTokenDto): Promise<{ access_token: string; refresh_token: string }> {
    // Refresh token 검증
    const payload = this.jwtService.verify(refreshTokenDto.refreshToken, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
    });

    // Redis에서 저장된 refresh token과 비교
    const storedToken = await this.redisService.get(`refresh_token:${payload.sub}`);
    if (storedToken !== refreshTokenDto.refreshToken) {
      throw new CustomException(ErrorCode.INVALID_REFRESH_TOKEN)
    }

    // 사용자 존재 확인
    const user = await this.userRepository.findOne(payload.sub);

    if (!user) {
      throw new CustomException(ErrorCode.USER_NOT_FOUND);
    }

    // 이전 refresh token 삭제
    await this.redisService.del(`refresh_token:${user.userId}`);

    // 새로운 토큰 발급
    return await this.login(user);
  }

  async logout(userId: number) {
    const user = await this.userRepository.findOne(userId);

    if (!user) {
      throw new CustomException(ErrorCode.USER_NOT_FOUND);
    }

    await this.redisService.del(`refresh_token:${user.userId}`);
  }

  async handleKakaoLogin(user: User | KakaoRegisterInfo): Promise<{ access_token: string; refresh_token: string }> {
    if ('userId' in user) {
      // 기존 회원: 로그인 처리
      return await this.login(user as User);
    } else {
      // 신규 회원: 자동 회원가입 후 로그인 처리
      const newUser = UserMapper.fromKakaoRegisterInfo(user as KakaoRegisterInfo);
      const savedUser = await this.userRepository.save(newUser);
      return await this.login(savedUser);
    }
  }
}
