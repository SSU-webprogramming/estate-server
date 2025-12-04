import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ProviderType } from '@/common/enums/provider-type.enum';
import { User } from '@/modules/user/entities/user.entity';

export class UserResponseDto {
  @ApiProperty({ description: '사용자 ID' })
  @Expose()
  userId: number;

  @ApiProperty({ description: '이메일' })
  @Expose()
  email: string;

  @ApiProperty({ description: '사용자명' })
  @Expose()
  username: string | null;

  @ApiProperty({ description: 'OAuth 제공자 타입', enum: ProviderType })
  @Expose()
  providerType: ProviderType | null;

  @ApiProperty({ description: '사용자 역할' })
  @Expose()
  role: string;

  @ApiProperty({ description: '생성 일시' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: '수정 일시' })
  @Expose()
  updatedAt: Date;
}