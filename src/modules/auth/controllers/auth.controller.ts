import { Controller, Get, UseGuards, Req, Res } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import type { RequestWithUser } from '../interfaces/request-with-user.interface';
import { KakaoAuthGuard } from '../guards/kakao-auth.guard';
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('kakao')
  @UseGuards(KakaoAuthGuard)
  kakaoLogin() {
    // This endpoint will trigger the Kakao login flow
  }

  @Get('kakao/callback')
  @UseGuards(KakaoAuthGuard)
  async kakaoLoginCallback(
    @Req() req: RequestWithUser,
  ): Promise<{ access_token: string, refresh_token }> {
    const { user } = req;
    return await this.authService.login(user);
  }
}
