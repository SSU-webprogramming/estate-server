import { IsNotEmpty, IsString, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsValidAgreedTerms } from '@/common/validators/agreed-terms.validator';

export class RegisterDto {
  @ApiProperty({
    description: '회원가입 토큰 (Kakao 로그인 후 발급받은 토큰)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty({ message: '회원가입 토큰은 필수입니다.' })
  registerToken: string;

  @ApiProperty({
    description: '약관 동의 내역 (key: term_id, value: boolean)',
    example: { 1: true, 2: true, 3: false },
  })
  @IsObject()
  @IsNotEmpty({ message: '약관 동의 내역은 필수입니다.' })
  @IsValidAgreedTerms()
  agreedTerms: Record<string, boolean>;
}
