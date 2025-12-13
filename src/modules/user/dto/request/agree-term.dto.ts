import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsNotEmpty } from 'class-validator';
import { IsValidAgreedTerms } from '@/common/validators/agreed-terms.validator';

export class AgreeTermsRequestDto {
  @ApiProperty({
    description: '약관 동의 내역 (key: term_id, value: boolean)',
    example: { 1: true, 2: true, 3: false },
    type: 'object',
    additionalProperties: { type: 'boolean' },
  })
  @IsObject()
  @IsNotEmpty({ message: '약관 동의 내역은 필수입니다.' })
  @IsValidAgreedTerms()
  agreedTerms: Record<string, boolean>;
}
  