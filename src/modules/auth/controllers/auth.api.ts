import { applyDecorators } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

export const ApiAuthController = () => applyDecorators(ApiTags('인증'));

export const ApiKakaoLogin = () =>
  applyDecorators(
    ApiOperation({
      summary: '카카오 로그인',
      description: '카카오 OAuth 로그인을 시작합니다.',
    }),
  );

export const ApiKakaoLoginCallback = () =>
  applyDecorators(
    ApiOperation({
      summary: '카카오 로그인 콜백',
      description: '카카오 OAuth 로그인 콜백을 처리하고 토큰을 발급합니다.',
    }),
  );

export const ApiRefreshToken = () =>
  applyDecorators(
    ApiOperation({
      summary: '토큰 갱신',
      description: '리프레시 토큰을 사용하여 새로운 액세스 토큰과 리프레시 토큰을 발급합니다.',
    }),
  );

export const ApiLogout = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: '로그아웃',
      description: '사용자를 로그아웃하고 리프레시 토큰을 무효화합니다.',
    }),
  );

