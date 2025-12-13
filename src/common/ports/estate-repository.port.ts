import { Estate } from '@/modules/estate/entities/estate.entity';
import { GetEstateListDto } from '@/modules/estate/dto/request/get-estate-list.dto';

export abstract class IEstateRepository {
  abstract create(estate: Partial<Estate>): Estate;

  abstract save(estate: Estate): Promise<Estate>;

  abstract findAllWithPagination(
    userId: number,
    getEstateListDto: GetEstateListDto,
  ): Promise<[Estate[], number]>;

  abstract findAll(): Promise<Estate[]>;

  abstract findOne(estateId: number): Promise<Estate | null>;

  abstract findOneByUserIdAndEstateId(
    userId: number,
    estateId: number,
  ): Promise<Estate | null>;

  abstract findByUserId(userId: number): Promise<Estate[]>;

  abstract findByNormalizedAddress(
    address: string,
    userId?: number,
  ): Promise<Estate[]>;

  abstract delete(estateId: number): Promise<{ affected?: number }>;

  abstract softDelete(estateId: number): Promise<void>;
}
