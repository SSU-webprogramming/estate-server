import { ApiProperty } from '@nestjs/swagger';

export class TermResponseDto {
  @ApiProperty({ description: '약관 ID' })
  id: number;

  @ApiProperty({ description: '약관 제목' })
  title: string;

  @ApiProperty({ description: '약관 내용' })
  content: string;

  @ApiProperty({ description: '필수 여부' })
  isRequired: boolean;

  @ApiProperty({ description: '생성 일시' })
  createdAt: Date;

  @ApiProperty({ description: '수정 일시' })
  updatedAt: Date;
}
