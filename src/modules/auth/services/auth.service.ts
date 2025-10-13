import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { RedisService } from '../../redis/redis.service';
import { ConfigService } from '@nestjs/config';

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
    provider: string,
    providerId: string,
    username: string,
    email: string,
    birthdate: string,
    gender: string
  ): Promise<User> {
    let user = await this.userRepository.findOne({
      where: { provider, providerId },
    });

    if (!user) {
      user = this.userRepository.create({
        provider,
        providerId,
        username,
        email,
        birthdate,
        gender
      });
    }

    return this.userRepository.save(user);
  }

  async login(user: User) {
    const payload = { username: user.username, sub: user.id };
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
    await this.redisService.set(`refresh_token:${user.id}`, refreshToken, refreshTokenTTL);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }
}
