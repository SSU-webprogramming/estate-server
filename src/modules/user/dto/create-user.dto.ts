import {
  IsString,
  MinLength,
  IsEmail,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

enum Gender {
  MALE = 'male',
  FEMALE = 'female',
}

export class CreateUserDto {
  @ApiProperty({ description: '사용자 이름', minLength: 3 })
  @IsString()
  @MinLength(3)
  username: string;

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
