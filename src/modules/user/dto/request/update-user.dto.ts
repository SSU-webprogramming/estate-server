import {
  IsString,
  MinLength,
  IsOptional,
  IsEmail,
  IsEnum,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Gender } from '@/common/enums/gender.enum';

export class UpdateUserDto {
  @ApiProperty({ description: '사용자 이름', minLength: 3, required: false })
  @IsOptional()
  @IsString({ message: '사용자 이름은 문자열이어야 합니다.' })
  @MinLength(3, { message: '사용자 이름은 최소 3자 이상이어야 합니다.' })
  username?: string;

  @ApiProperty({ description: '이메일', required: false })
  @IsOptional()
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  email?: string;

  @ApiProperty({ description: '생년월일 (MMDD)', required: false, example: '0101' })
  @IsOptional()
  @IsString({ message: '생년월일은 문자열이어야 합니다.' })
  @Matches(/^\d{4}$/, { message: '생년월일은 MMDD 형식(4자리 숫자)이어야 합니다.' })
  birthdate?: string;

  @ApiProperty({ description: '성별', enum: Gender, required: false })
  @IsOptional()
  @IsEnum(Gender, { message: '올바른 성별 값이 아닙니다.' })
  gender?: Gender;
}
