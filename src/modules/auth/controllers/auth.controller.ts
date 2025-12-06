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
    try {
      const { user } = req;
      const tokens = await this.authService.login(user);

      // 프론트엔드 콜백 URL로 리다이렉트 (토큰을 쿼리 파라미터로 전달)
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
      const redirectUrl = `${frontendUrl}/callback?access_token=${tokens.access_token}&refresh_token=${tokens.refresh_token}`;

      return res.redirect(redirectUrl);
    } catch (error) {
      console.error('카카오 로그인 콜백 오류:', error);

      // 에러 발생 시 프론트엔드 콜백으로 에러 전달
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
      const errorUrl = `${frontendUrl}/callback?error=login_failed&error_description=${encodeURIComponent('로그인 처리 중 오류가 발생했습니다.')}`;

      return res.redirect(errorUrl);
    }
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
  async logout(@Req() req: RequestWithUser): Promise<{ message: string }> {
    await this.authService.logout(req.user.userId);
    return { message: 'Logged out successfully' };
  }
}