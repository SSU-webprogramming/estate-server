import {
  IsString,
  MinLength,
  IsOptional,
  IsEmail,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

enum Gender {
  MALE = 'male',
  FEMALE = 'female',
}

export class UpdateUserDto {
  @ApiProperty({ description: '사용자 이름', minLength: 3, required: false })
  @IsOptional()
  @IsString()
  @MinLength(3)
  username?: string;

  @ApiProperty({ description: '이메일', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: '생년월일 (MMDD)', required: false })
  @IsOptional()
  @IsString()
  birthdate?: string;

  @ApiProperty({ description: '성별', enum: Gender, required: false })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;
}
