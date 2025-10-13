import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { KakaoStrategy } from './strategies/kakao.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RedisModule } from '../redis/redis.module';
import { KakaoAuthGuard } from './guards/kakao-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
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
  providers: [AuthService, KakaoStrategy, JwtStrategy, KakaoAuthGuard, JwtAuthGuard],
  exports: [KakaoAuthGuard, JwtAuthGuard]
})
export class AuthModule {}
