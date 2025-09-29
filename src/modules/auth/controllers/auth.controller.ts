import { Controller, Get, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from '../services/auth.service';
import type { Response } from 'express';
import { RequestWithUser } from '../interfaces/request-with-user.interface';

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
  async kakaoLoginCallback(@Req() req: RequestWithUser, @Res() res: Response) {
    const { user } = req;
    const token = await this.authService.login(user);

    // Redirect to frontend with the token
    // TODO: Replace with your actual frontend URL
    res.redirect(`http://localhost:3000/auth/callback?token=${token.access_token}`);
  }
}
