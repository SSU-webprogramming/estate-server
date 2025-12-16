import { IsBoolean, IsNumber, IsString, IsOptional, Min, Max } from 'class-validator';

/**
 * 문서 판별 결과 DTO
 */
export class DocumentValidationResultDto {
  @IsBoolean()
  isRealEstateDocument: boolean;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @IsOptional()
  @IsString()
  documentType?: string | null;

  @IsString()
  reason: string;
}

