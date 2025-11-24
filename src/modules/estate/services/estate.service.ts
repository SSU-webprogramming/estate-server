import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Estate } from '../entities/estate.entity';
import { CreateEstateDto } from '../dto/create-estate.dto';
import { Document } from '../../document/entities/document.entity';
import { S3Port } from '../../../common/ports/s3.port';

@Injectable()
export class EstateService {
  constructor(
    @InjectRepository(Estate)
    private readonly estateRepository: Repository<Estate>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly s3Port: S3Port,
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
      userId,
      address: createEstateDto.address ?? null,
      addressDetail: createEstateDto.addressDetail ?? null,
      contractType: createEstateDto.contractType ?? null,
      deposit: createEstateDto.deposit ?? 0,
      monthlyRent: createEstateDto.monthlyRent ?? 0,
      kbMarketPrice: createEstateDto.kbMarketPrice ?? 0
    });
    const savedEstate = await this.estateRepository.save(estate);

    // documentIds가 제공된 경우 문서들을 estate에 연결
    if (createEstateDto.documentIds && createEstateDto.documentIds.length > 0) {
      await this.linkDocumentsToEstate(savedEstate.estateId, createEstateDto.documentIds);
    }

    return savedEstate;
  }

  /**
   * 문서들을 estate에 연결합니다.
   * @param estateId 부동산 ID
   * @param documentIds 연결할 문서 ID 목록
   */
  private async linkDocumentsToEstate(
    estateId: number,
    documentIds: number[],
  ): Promise<void> {
    const documents = await this.documentRepository.find({
      where: { docId: In(documentIds) },
    });

    if (documents.length === 0) {
      return;
    }

    const estate = await this.estateRepository.findOne({
      where: { estateId },
    });

    if (!estate) {
      throw new Error(`Estate with id ${estateId} not found`);
    }

    // 문서들의 estateId와 estate 관계 업데이트 및 S3 파일 이동
    for (const document of documents) {
      document.estateId = estateId;
      document.estate = estate;
      
      // S3 키를 temp에서 estateId로 변경하고 파일 이동
      if (document.s3Key.startsWith('temp/')) {
        const fileName = document.s3Key.split('/').pop();
        const newKey = `${estateId}/${fileName}`;
        
        // S3에서 파일 복사
        await this.s3Port.copy(document.s3Key, newKey);
        
        // 기존 파일 삭제
        try {
          await this.s3Port.delete(document.s3Key);
        } catch (error) {
          console.error(`Failed to delete old S3 file ${document.s3Key}:`, error);
          // 삭제 실패해도 계속 진행
        }
        
        document.s3Key = newKey;
      }
    }

    await this.documentRepository.save(documents);
  }

  async findAll(): Promise<Estate[]> {
    return this.estateRepository.find({
      relations: ['user', 'documents', 'analysisResults'],
    });
  }

  async findOne(estateId: number): Promise<Estate> {
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

