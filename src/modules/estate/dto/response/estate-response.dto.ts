import { ApiProperty } from '@nestjs/swagger';
import { ContractType } from '../../../../common/enums/contract-type.enum';

/**
 * 부동산 응답 DTO
 */
export class EstateResponseDto {
  @ApiProperty({
    description: '부동산 ID',
    example: 1,
  })
  estateId: number;

  @ApiProperty({
    description: '소유자 사용자 ID',
    example: 1,
  })
  userId: number;

  @ApiProperty({
    description: '주소',
    example: '서울특별시 강남구 테헤란로 123',
    nullable: true,
  })
  address: string | null;

  @ApiProperty({
    description: '상세 주소',
    example: '101동 101호',
    nullable: true,
  })
  addressDetail: string | null;

  @ApiProperty({
    description: '계약 타입',
    enum: ContractType,
    example: ContractType['전세'],
    nullable: true,
  })
  contractType: ContractType | null;

  @ApiProperty({
    description: '보증금 (원)',
    example: 100000000,
  })
  deposit: number;

  @ApiProperty({
    description: '월세 (원)',
    example: 500000,
  })
  monthlyRent: number;

  @ApiProperty({
    description: 'KB 시세 (원)',
    example: 500000000,
  })
  kbMarketPrice: number;


  @ApiProperty({
    description: '생성 일시',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '수정 일시',
    example: '2024-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}