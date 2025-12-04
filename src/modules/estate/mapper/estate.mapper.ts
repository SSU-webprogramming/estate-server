import { Estate } from '@/modules/estate/entities/estate.entity';
import { CreateEstateDto } from '@/modules/estate/dto/request/create-estate.dto';
import { EstateResponseDto } from '@/modules/estate/dto/response/estate-response.dto';

/**
 * Estate 엔티티 <-> DTO 매핑 전담 클래스
 */
export class EstateMapper {
  /**
   * 부동산 생성용 DTO + userId -> Estate 엔티티 생성에 사용할 데이터
   */
  static fromCreateDto(userId: number, dto: CreateEstateDto): Partial<Estate> {
    return {
      userId,
      address: dto.address ?? null,
      addressDetail: dto.addressDetail ?? null,
      contractType: dto.contractType ?? null,
      deposit: dto.deposit ?? 0,
      monthlyRent: dto.monthlyRent ?? 0,
      kbMarketPrice: dto.kbMarketPrice ?? 0,
    };
  }

  /**
   * 단일 Estate 엔티티 -> 응답 DTO
   */
  static toResponseDto(estate: Estate): EstateResponseDto {
    const dto = new EstateResponseDto();

    dto.estateId = estate.estateId;
    dto.userId = estate.userId;
    dto.address = estate.address;
    dto.addressDetail = estate.addressDetail;
    dto.contractType = estate.contractType;
    dto.deposit = estate.deposit;
    dto.monthlyRent = estate.monthlyRent;
    dto.kbMarketPrice = estate.kbMarketPrice;
    dto.createdAt = estate.createdAt;
    dto.updatedAt = estate.updatedAt;

    return dto;
  }

  /**
   * Estate 엔티티 배열 -> 응답 DTO 배열
   */
  static toResponseDtoList(estates: Estate[]): EstateResponseDto[] {
    return estates.map((estate) => this.toResponseDto(estate));
  }
}


