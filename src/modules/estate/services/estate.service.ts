import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Estate } from '../entities/estate.entity';
import { CreateEstateDto } from '../dto/create-estate.dto';
import { v4 as uuidV4 } from 'uuid';

@Injectable()
export class EstateService {
  constructor(
    @InjectRepository(Estate)
    private readonly estateRepository: Repository<Estate>,
  ) {}

  /**
   * 부동산 정보를 생성합니다.
   * @param userId 사용자 ID
   * @param createEstateDto 부동산 생성 DTO
   * @returns 생성된 부동산 엔티티
   */
  async create(
    userId: number,
    createEstateDto: CreateEstateDto,
  ): Promise<Estate> {
    const estate = this.estateRepository.create({
      estateId: uuidV4(),
      userId,
      address: createEstateDto.address ?? null,
      addressDetail: createEstateDto.addressDetail ?? null,
      contractType: createEstateDto.contractType ?? null,
      deposit: createEstateDto.deposit ?? 0,
      monthlyRent: createEstateDto.monthlyRent ?? 0,
      kbMarketPrice: createEstateDto.kbMarketPrice ?? 0
    });
    return this.estateRepository.save(estate);
  }

  async findAll(): Promise<Estate[]> {
    return this.estateRepository.find({
      relations: ['user', 'documents', 'analysisResults'],
    });
  }

  async findOne(estateId: string): Promise<Estate> {
    const estate = await this.estateRepository.findOne({
      where: { estateId },
      relations: ['user', 'documents', 'analysisResults'],
    });
    if (!estate) {
      throw new Error(`Estate with id ${estateId} not found`);
    }
    return estate;
  }

  async findByUserId(userId: number): Promise<Estate[]> {
    return this.estateRepository.find({
      where: { userId },
      relations: ['documents', 'analysisResults'],
    });
  }

  async update(estateId: string, updateData: Partial<Estate>): Promise<Estate> {
    const estate = await this.findOne(estateId);
    Object.assign(estate, updateData);
    return this.estateRepository.save(estate);
  }

  async remove(estateId: string): Promise<void> {
    const result = await this.estateRepository.delete(estateId);
    if (result.affected === 0) {
      throw new Error(`Estate with id ${estateId} not found`);
    }
  }
}

