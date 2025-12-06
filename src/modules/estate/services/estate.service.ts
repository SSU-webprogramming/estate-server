import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

@Injectable()
export class EstateService {
  constructor(
    @InjectRepository(Estate)
    private readonly estateRepository: Repository<Estate>,
    private readonly documentService: DocumentService,
  ) {}

  /**
   * 매물을 생성합니다.
   * @param userId 사용자 ID
   * @param createEstateDto 매물 생성 DTO
   * @returns 생성된 매물 엔티티
   */
  async create(
    userId: number,
    createEstateDto: CreateEstateDto,
  ): Promise<EstateResponseDto> {
    const estate = this.estateRepository.create(
      EstateMapper.fromCreateDto(userId, createEstateDto),
    );
    const savedEstate = await this.estateRepository.save(estate);

    // documentIds가 있는 경우 문서를 estate에 연결
    if (createEstateDto.documentIds && createEstateDto.documentIds.length > 0) {
      await this.documentService.attachDocumentsToEstate(
        createEstateDto.documentIds,
        savedEstate.estateId,
      );
    }

    return EstateMapper.toResponseDto(savedEstate);
  }

  /**
   * 부동산 목록을 페이징하여 조회합니다.
   * @param userId 사용자 ID
   * @param getEstateListDto 페이징 요청 DTO
   * @returns 페이징된 부동산 목록
   */
  async findAllWithPagination(
    userId: number,
    getEstateListDto: GetEstateListDto,
  ): Promise<PaginationResponseDto<EstateResponseDto>> {
    const [estates, total] = await this.estateRepository.findAndCount({
      where: { userId },
      skip: getEstateListDto.skip,
      take: getEstateListDto.limit,
      relations: ['user', 'documents', 'analysisResult'],
      order: {
        createdAt: 'DESC',
      },
    });

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
    return this.estateRepository.find({
      relations: ['user', 'documents', 'analysisResult'],
    });
  }

  async findOne(estateId: number): Promise<Estate> {
    const estate = await this.estateRepository.findOne({
      where: { estateId },
      relations: ['user', 'documents', 'analysisResult'],
    });
    if (!estate) {
      throw new Error(`Estate with id ${estateId} not found`);
    }
    return estate;
  }

  async findByUserId(userId: number): Promise<Estate[]> {
    return this.estateRepository.find({
      where: { userId },
      relations: ['documents', 'analysisResult'],
    });
  }

  async update(estateId: number, updateData: Partial<Estate>): Promise<Estate> {
    const estate = await this.findOne(estateId);
    Object.assign(estate, updateData);
    return this.estateRepository.save(estate);
  }

  async remove(estateId: number): Promise<void> {
    const result = await this.estateRepository.delete(estateId);
    if (result.affected === 0) {
      throw new Error(`Estate with id ${estateId} not found`);
    }
  }
}

