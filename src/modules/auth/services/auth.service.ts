import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '@/modules/user/entities/user.entity';
import { ProviderType } from '@/common/enums/provider-type.enum';
import { RedisService } from '@/modules/redis/redis.service';
import { CustomException } from '@/common/errors/custom-exception';
import { ErrorCode } from '@/common/errors/error';
import { RefreshTokenDto } from '@/modules/auth/dto/request/refresh-token.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async validateAndSaveUser(
    providerType: ProviderType,
    providerId: string,
    username: string,
    email: string,
  ): Promise<User> {
    let user = await this.userRepository.findOne({
      where: { providerType, providerId },
    });

    if (!user) {
      user = this.userRepository.create({
        providerType,
        providerId,
        username,
        email,
      });
    }

    return this.userRepository.save(user);
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
    const user = await this.userRepository.findOne({
      where: { userId: payload.sub },
    });

    if (!user) {
      throw new CustomException(ErrorCode.USER_NOT_FOUND);
    }

    // 이전 refresh token 삭제
    await this.redisService.del(`refresh_token:${user.userId}`);

    // 새로운 토큰 발급
    return await this.login(user);
  }

  async logout(userId: number) {
    // 사용자 존재 확인
    const user = await this.userRepository.findOne({
      where: { userId },
    });

    if (!user) {
      throw new CustomException(ErrorCode.USER_NOT_FOUND);
    }

    // 이전 refresh token 삭제
    await this.redisService.del(`refresh_token:${user.userId}`);
  }
}
