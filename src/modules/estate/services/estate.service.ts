import { Injectable } from '@nestjs/common';
import { Estate } from '@/modules/estate/entities/estate.entity';
import { CreateEstateDto } from '@/modules/estate/dto/request/create-estate.dto';
import { EstateMapper } from '@/modules/estate/mapper/estate.mapper';
import { EstateResponseDto } from '../dto/response/estate-response.dto';
import { DocumentService } from '@/modules/document/services/document.service';
import { GetEstateListDto } from '../dto/request/get-estate-list.dto';
import {
  PaginationResponseDto,
  PaginationMetaDto,
} from '@/common/dto/pagination-response.dto';
import { CustomException } from '@/common/errors/custom-exception';
import { ErrorCode } from '@/common/errors/error';
import { EstateRepository } from '@/modules/estate/repositories/estate.repository';

@Injectable()
export class EstateService {
  constructor(
    private readonly estateRepository: EstateRepository,
    private readonly documentService: DocumentService,
  ) {}

  async create(
    userId: number,
    createEstateDto: CreateEstateDto,
  ): Promise<EstateResponseDto> {
    const estateData = EstateMapper.fromCreateDto(userId, createEstateDto);
    const estate = this.estateRepository.create(estateData);
    const savedEstate = await this.estateRepository.save(estate);

    if (createEstateDto.documentIds && createEstateDto.documentIds.length > 0) {
      await this.documentService.attachDocumentsToEstate(
        createEstateDto.documentIds,
        savedEstate.estateId,
      );
    }

    return EstateMapper.toResponseDto(savedEstate);
  }

  async findAllWithPagination(
    userId: number,
    getEstateListDto: GetEstateListDto,
  ): Promise<PaginationResponseDto<EstateResponseDto>> {
    const [estates, total] = await this.estateRepository.findAllWithPagination(
      userId,
      getEstateListDto,
    );

    const estateDtos = estates.map((estate) =>
      EstateMapper.toResponseDto(estate),
    );
    const meta = new PaginationMetaDto(
      getEstateListDto.page,
      getEstateListDto.limit,
      total,
    );

    return new PaginationResponseDto(estateDtos, meta);
  }

  async findAll(): Promise<Estate[]> {
    return this.estateRepository.findAll();
  }

  async findOne(estateId: number): Promise<Estate> {
    const estate = await this.estateRepository.findOne(estateId);
    if (!estate) {
      throw new CustomException(ErrorCode.ESTATE_NOT_FOUND);
    }
    return estate;
  }

  async findByUserId(userId: number): Promise<Estate[]> {
    return this.estateRepository.findByUserId(userId);
  }

  async update(estateId: number, updateData: Partial<Estate>): Promise<Estate> {
    const estate = await this.findOne(estateId);
    Object.assign(estate, updateData);
    return this.estateRepository.save(estate);
  }

  async remove(estateId: number): Promise<void> {
    const result = await this.estateRepository.delete(estateId);
    if (result.affected === 0) {
      throw new CustomException(ErrorCode.ESTATE_NOT_FOUND);
    }
  }

  async deleteEstate(userId: number, estateId: number): Promise<void> {
    const estate = await this.estateRepository.findOneByUserIdAndEstateId(
      userId,
      estateId,
    );

    if (!estate) {
      throw new CustomException(ErrorCode.ESTATE_NOT_FOUND);
    }

    await this.estateRepository.softDelete(estateId);
  }
}

