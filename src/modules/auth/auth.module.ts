import { Module, forwardRef } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from '@/modules/user/user.module';
import { AuthService } from '@/modules/auth/services/auth.service';
import { AuthController } from '@/modules/auth/controllers/auth.controller';
import { KakaoStrategy } from '@/modules/auth/strategies/kakao.strategy';
import { JwtStrategy } from '@/modules/auth/strategies/jwt.strategy';
import { RedisModule } from '@/modules/redis/redis.module';
import { KakaoAuthGuard } from '@/modules/auth/guards/kakao-auth.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
@Module({
  imports: [
    forwardRef(() => UserModule),
    PassportModule,
    RedisModule.register(),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, KakaoStrategy, JwtStrategy, KakaoAuthGuard, JwtAuthGuard, RolesGuard],
  exports: [KakaoAuthGuard, JwtAuthGuard, RolesGuard]
})
export class AuthModule {}
