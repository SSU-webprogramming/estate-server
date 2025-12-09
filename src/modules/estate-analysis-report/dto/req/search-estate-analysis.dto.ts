import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SafetyScoreSearchType } from './safety-score-search-type.enum';
import { PaginationRequestDto } from '@/common/dto/pagination-request.dto';

export class SearchEstateAnalysisDto extends PaginationRequestDto {
  @ApiProperty({
    description: '안전 점수 검색 조건 (안전, 주의, 위험)',
    enum: SafetyScoreSearchType,
    required: false,
  })
  @IsOptional()
  @IsEnum(SafetyScoreSearchType)
  safetyScore?: SafetyScoreSearchType;

  @ApiProperty({
    description: '주소 검색어',
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string;
}
