import { Controller, Get, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../services/auth.service';
import type { Response } from 'express';
import type { RequestWithUser } from '../interfaces/request-with-user.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('kakao')
  @UseGuards(AuthGuard('kakao'))
  kakaoLogin() {
    // This endpoint will trigger the Kakao login flow
  }

  @Get('kakao/callback')
  @UseGuards(AuthGuard('kakao'))
  async kakaoLoginCallback(
    @Req() req: RequestWithUser,
  ): Promise<{ access_token: string }> {
    const { user } = req;
    const token = await this.authService.login(user);
    return token;
  }
}
