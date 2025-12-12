import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTermDto {
  @ApiProperty({ description: '약관 제목' })
  @IsString({ message: '약관 제목은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '약관 제목은 필수입니다.' })
  title: string;

  @ApiProperty({ description: '약관 내용' })
  @IsString({ message: '약관 내용은 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '약관 내용은 필수입니다.' })
  content: string;

  @ApiProperty({ description: '필수 여부' })
  @IsBoolean({ message: '필수 여부는 boolean 값이어야 합니다.' })
  isRequired: boolean;
}
