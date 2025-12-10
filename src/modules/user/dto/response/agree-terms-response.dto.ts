import { ApiProperty } from '@nestjs/swagger';

/**
 * 약관 동의 응답 DTO
 */
export class AgreeTermsResponseDto {
  @ApiProperty({
    description: '약관 동의 성공 메시지',
    example: '약관 동의가 완료되었습니다.',
  })
  message: string;

  @ApiProperty({
    description: '약관 동의 내역',
    example: { 1: true, 2: true, 3: false },
    type: 'object',
    additionalProperties: { type: 'boolean' },
  })
  agreedTerms: Record<string, boolean>;

  constructor(agreedTerms: Record<string, boolean>) {
    this.message = '약관 동의가 완료되었습니다.';
    this.agreedTerms = agreedTerms;
  }
}

