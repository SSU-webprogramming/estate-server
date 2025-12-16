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
    // Step 1: OAuth Provider ID로 기존 사용자 조회
    let user = await this.userRepository.findByProvider(providerType, providerId);

    // Step 2: 기존 사용자면 즉시 반환
    if (user) {
      return user;
    }

    // Step 3: 이메일로 사용자 조회 (중복 확인)
    user = await this.userRepository.findByEmail(email);
    
    // Step 4: 신규 사용자 정보 반환 (회원가입 필요)
    return {
      providerType,
      providerId,
      username,
      email,
    };
  }

  async login(user: User): Promise<{ access_token: string; refresh_token: string }> {
    // Step 1: JWT 페이로드 생성 (username, userId)
    const payload = { username: user.username, sub: user.userId };
    
    // Step 2: Access Token과 Refresh Token 병렬 생성
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(payload),
      this.generateRefreshToken(payload),
    ]);

    // Step 3: Refresh Token을 Redis에 저장 (TTL 적용)
    await this.storeRefreshToken(user.userId, refreshToken);

    // Step 4: 토큰 쌍 반환
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  private async generateAccessToken(payload: { username: string | null; sub: number }): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION_TIME'),
    });
  }

  private async generateRefreshToken(payload: { username: string | null; sub: number }): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRATION_TIME'),
    });
  }

  private async storeRefreshToken(userId: number, refreshToken: string): Promise<void> {
    const refreshTokenTTL = this.configService.get<number>('JWT_REFRESH_TOKEN_EXPIRATION_TIME_TTL');
    await this.redisService.set(`refresh_token:${userId}`, refreshToken, refreshTokenTTL);
  }

  async refreshTokens(refreshTokenDto: RefreshTokenDto): Promise<{ access_token: string; refresh_token: string }> {
    // Step 1: Refresh Token 서명 검증 및 페이로드 추출
    const payload = this.verifyRefreshToken(refreshTokenDto.refreshToken);
    
    // Step 2: Redis에 저장된 토큰과 일치 여부 확인
    await this.validateStoredRefreshToken(payload.sub, refreshTokenDto.refreshToken);
    
    // Step 3: 사용자 존재 여부 확인
    const user = await this.findUserById(payload.sub);
    
    // Step 4: 기존 Refresh Token 제거 (재사용 방지)
    await this.deleteRefreshToken(user.userId);

    // Step 5: 새로운 토큰 쌍 발급
    return this.login(user);
  }

  private verifyRefreshToken(refreshToken: string): { username: string; sub: number } {
    return this.jwtService.verify(refreshToken, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
    });
  }

  private async validateStoredRefreshToken(userId: number, providedToken: string): Promise<void> {
    const storedToken = await this.redisService.get(`refresh_token:${userId}`);
    if (storedToken !== providedToken) {
      throw new CustomException(ErrorCode.INVALID_REFRESH_TOKEN);
    }
  }

  private async findUserById(userId: number): Promise<User> {
    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new CustomException(ErrorCode.USER_NOT_FOUND);
    }
    return user;
  }

  private async deleteRefreshToken(userId: number): Promise<void> {
    await this.redisService.del(`refresh_token:${userId}`);
  }

  async logout(userId: number): Promise<void> {
    // Step 1: 사용자 존재 여부 확인
    const user = await this.findUserById(userId);
    
    // Step 2: Redis에서 Refresh Token 삭제
    await this.deleteRefreshToken(user.userId);
  }

  async handleKakaoLogin(user: User | KakaoRegisterInfo): Promise<{ access_token: string; refresh_token: string }> {
    // Step 1: 기존 사용자 여부 확인
    if (this.isExistingUser(user)) {
      // Step 2-1: 기존 사용자면 바로 로그인 처리
      return this.login(user);
    }
    
    // Step 2-2: 신규 사용자면 회원가입 후 로그인 처리
    return this.registerAndLogin(user);
  }

  private isExistingUser(user: User | KakaoRegisterInfo): user is User {
    return 'userId' in user;
  }

  private async registerAndLogin(registerInfo: KakaoRegisterInfo): Promise<{ access_token: string; refresh_token: string }> {
    // Step 1: 카카오 정보를 User Entity로 매핑
    const newUser = UserMapper.fromKakaoRegisterInfo(registerInfo);
    
    // Step 2: DB에 사용자 저장
    const savedUser = await this.userRepository.save(newUser);
    
    // Step 3: 자동 로그인 처리 및 토큰 발급
    return this.login(savedUser);
  }
}
