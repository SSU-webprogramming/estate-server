import { Controller, Get, UseGuards, Req, Res, Post, Body, Delete } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from '@/modules/auth/services/auth.service';
import type { RequestWithUser } from '@/modules/auth/interfaces/request-with-user.interface';
import { KakaoAuthGuard } from '@/modules/auth/guards/kakao-auth.guard';
import { RefreshTokenDto } from '@/modules/auth/dto/request/refresh-token.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import {
  ApiAuthController,
  ApiKakaoLogin,
  ApiKakaoLoginCallback,
  ApiRefreshToken,
  ApiLogout,
} from '../swagger/auth.api';
import { GetUser } from '@/modules/auth/decorators/get-user.decorator';
import { User } from '@/modules/user/entities/user.entity';
import { RegisterDto } from '@/modules/auth/dto/request/register.dto';
import { KakaoRegisterInfo } from '@/modules/auth/interfaces/request-with-user.interface';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiAuthController()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('kakao')
  @UseGuards(KakaoAuthGuard)
  @ApiKakaoLogin()
  kakaoLogin() {
    // This endpoint will trigger the Kakao login flow
  }

  @Get('kakao/callback')
  @UseGuards(KakaoAuthGuard)
  @ApiKakaoLoginCallback()
  async kakaoLoginCallback(
    @Req() req: RequestWithUser,
    @Res() res: Response,
  ) {
    const { user } = req;
    const redirectUrl = await this.authService.handleKakaoLogin(user);
    return res.redirect(redirectUrl);
  }

  @Post('register')
  @ApiOperation({ summary: '회원가입 (약관 동의 포함)' })
  @ApiResponse({ status: 201, description: '회원가입 성공 및 토큰 발급' })
  async register(@Body() registerDto: RegisterDto) {
    return await this.authService.register(registerDto);
  }

  @Post('refresh')
  @ApiRefreshToken()
  async refresh(@Body() refreshTokenDto: RefreshTokenDto
  ): Promise<{ access_token: string; refresh_token: string }> {
    return await this.authService.refreshTokens(refreshTokenDto);
  }

  @Delete('logout')
  @UseGuards(JwtAuthGuard)
  @ApiLogout()
  async logout(@GetUser() user: User): Promise<{ message: string }> {
    await this.authService.logout(user.userId);
    return { message: 'Logged out successfully' };
  }
}