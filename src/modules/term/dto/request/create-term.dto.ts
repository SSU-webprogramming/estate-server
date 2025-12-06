import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTermDto {
  @ApiProperty({ description: '약관 제목' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: '약관 내용' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ description: '필수 여부' })
  @IsBoolean()
  isRequired: boolean;
}
