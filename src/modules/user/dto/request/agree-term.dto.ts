import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsNotEmpty } from 'class-validator';

export class AgreeTermsRequestDto {
    @ApiProperty({
      description: '약관 동의 내역 (key: term_id, value: boolean)',
      example: { 1: true, 2: true, 3: false },
      type: 'object',
      additionalProperties: { type: 'boolean' },
    })
    @IsObject()
    @IsNotEmpty()
    agreedTerms: Record<string, boolean>;
  }
  