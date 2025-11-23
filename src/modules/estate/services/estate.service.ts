import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Estate } from '../entities/estate.entity';
import { v4 as uuidV4 } from 'uuid';

@Injectable()
export class EstateService {
  constructor(
    @InjectRepository(Estate)
    private readonly estateRepository: Repository<Estate>,
  ) {}

  async create(estateData: Partial<Estate>): Promise<Estate> {
    const estate = this.estateRepository.create({
      estateId: uuidV4(),
      ...estateData,
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

