import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Estate } from '@/modules/estate/entities/estate.entity';
import { GetEstateListDto } from '@/modules/estate/dto/request/get-estate-list.dto';
import { normalizeAddress } from '@/common/utils/address.util';
import { IEstateRepository } from '@/common/ports/estate-repository.port';

@Injectable()
export class EstateRepository implements IEstateRepository {
  constructor(
    @InjectRepository(Estate)
    private readonly repository: Repository<Estate>,
  ) {}

  create(estate: Partial<Estate>): Estate {
    return this.repository.create(estate);
  }

  async save(estate: Estate): Promise<Estate> {
    return this.repository.save(estate);
  }

  async findAllWithPagination(
    userId: number,
    getEstateListDto: GetEstateListDto,
  ): Promise<[Estate[], number]> {
    return this.repository.findAndCount({
      where: { userId },
      skip: getEstateListDto.skip,
      take: getEstateListDto.limit,
      relations: ['user', 'documents', 'analysisResult'],
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findAll(): Promise<Estate[]> {
    return this.repository.find({
      relations: ['user', 'documents', 'analysisResult'],
    });
  }

  async findOne(estateId: number): Promise<Estate | null> {
    return this.repository.findOne({
      where: { estateId },
      relations: ['user', 'documents', 'analysisResult'],
    });
  }

  async findOneByUserIdAndEstateId(
    userId: number,
    estateId: number,
  ): Promise<Estate | null> {
    return this.repository.findOne({
      where: { estateId, userId },
    });
  }

  async findByUserId(userId: number): Promise<Estate[]> {
    return this.repository.find({
      where: { userId },
      relations: ['documents', 'analysisResult'],
    });
  }

  async findByNormalizedAddress(
    address: string,
    userId?: number,
  ): Promise<Estate[]> {
    const normalized = normalizeAddress(address);
    
    if (!normalized) {
      return [];
    }

    const qb = this.repository
      .createQueryBuilder('estate')
      .leftJoinAndSelect('estate.analysisResult', 'analysisResult')
      .where('analysisResult.id IS NOT NULL')
      .orderBy('analysisResult.analyzedAt', 'DESC');

    if (userId !== undefined) {
      qb.andWhere('estate.userId = :userId', { userId });
    }

    const estates = await qb.getMany();

    return estates.filter((estate) => {
      const estateNormalized = normalizeAddress(estate.address);
      return estateNormalized === normalized;
    });
  }

  async delete(estateId: number): Promise<{ affected?: number }> {
    const result = await this.repository.delete(estateId);
    return { affected: result.affected ?? undefined };
  }

  async softDelete(estateId: number): Promise<void> {
    await this.repository.softDelete(estateId);
  }
}

