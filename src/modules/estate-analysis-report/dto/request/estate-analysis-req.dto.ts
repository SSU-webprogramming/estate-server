import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
  MaxLength,
  IsArray,
  IsInt,
  IsBoolean,
  ArrayNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ContractType } from '@/common/enums/contract-type.enum';

/**
 * 부동산 분석 요청 DTO
 */
export class CreateEstateAnalysisDto {
  @ApiProperty({
    description: '주소',
    example: '서울특별시 강남구 테헤란로 123',
    maxLength: 255,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string | null;

  @ApiProperty({
    description: '상세 주소',
    example: '101동 101호',
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  addressDetail?: string | null;

  @ApiProperty({
    description: '계약 타입 (전세, 월세)',
    enum: ContractType,
    example: ContractType['전세'],
    required: false,
  })
  @IsOptional()
  @IsEnum(ContractType)
  contractType?: ContractType | null;

  @ApiProperty({
    description: '보증금 (원)',
    example: 100000000,
    minimum: 0,
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deposit?: number;

  @ApiProperty({
    description: '월세 (원)',
    example: 500000,
    minimum: 0,
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlyRent?: number;

  @ApiProperty({
    description: 'KB 시세 (원)',
    example: 500000000,
    minimum: 0,
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  kbMarketPrice?: number;

  @ApiProperty({
    description: '분석에 사용할 문서 ID 목록',
    example: [1, 2, 3],
    type: [Number],
    required: true,
  })
  @IsArray()
  @ArrayNotEmpty({ message: '분석에 사용할 문서는 최소 1개 이상 필요합니다.' })
  @IsInt({ each: true, message: '문서 ID는 정수여야 합니다.' })
  documentIds: number[];

  @ApiProperty({
    description: '강제 재분석 여부 (true: 캐시 무시하고 새로 분석, false: 캐시 사용)',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  forceReAnalyze?: boolean;
}