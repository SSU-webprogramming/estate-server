import { PaginationRequestDto } from '@/common/dto/pagination-request.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GetUserListDto extends PaginationRequestDto {
  @ApiPropertyOptional({
    description: '이름 검색',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: '이메일 검색',
  })
  @IsString()
  @IsOptional()
  email?: string;
}
