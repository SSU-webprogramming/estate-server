import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { UpdateUserDto } from '@/modules/user/dto/request/update-user.dto';
import { User } from '@/modules/user/entities/user.entity';
import { Estate } from '@/modules/estate/entities/estate.entity';
import { Document } from '@/modules/document/entities/document.entity';
import { ProviderType } from '@/common/enums/provider-type.enum';
import { CustomException } from '@/common/errors/custom-exception';
import { ErrorCode } from '@/common/errors/error';
import { GetUserListDto } from '@/modules/user/dto/request/get-user-list.dto';
import {
  PaginationResponseDto,
  PaginationMetaDto,
} from '@/common/dto/pagination-response.dto';
import { UserResponseDto } from '@/modules/user/dto/response/user-response.dto';
import { UserMapper } from '@/modules/user/mapper/user.mapper';
import { Like } from 'typeorm';
import { AgreeTermsRequestDto } from '@/modules/user/dto/request/agree-term.dto';
import { TermsValidator } from '@/modules/user/validators/terms-validator';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly termsValidator: TermsValidator,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findAllWithPagination(
    getUserListDto: GetUserListDto,
  ): Promise<PaginationResponseDto<UserResponseDto>> {
    const where: any = {};
    if (getUserListDto.name) {
      where.username = Like(`%${getUserListDto.name}%`);
    }
    if (getUserListDto.email) {
      where.email = Like(`%${getUserListDto.email}%`);
    }

    const [users, total] = await this.userRepository.findAndCount({
      where,
      skip: getUserListDto.skip,
      take: getUserListDto.limit,
      order: {
        createdAt: 'DESC',
      },
    });

    const userDtos = UserMapper.toResponseDtoList(users);
    const meta = new PaginationMetaDto(
      getUserListDto.page,
      getUserListDto.limit,
      total,
    );

    return new PaginationResponseDto(userDtos, meta);
  }

  async findOne(userId: number): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) {
      throw new CustomException(ErrorCode.USER_NOT_FOUND);
    }
    return UserMapper.toResponseDto(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findByProvider(
    providerType: ProviderType,
    providerId: string,
  ): Promise<User | null> {
    return this.userRepository.findOne({ where: { providerType, providerId } });
  }

  async update(userId: number, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) {
      throw new CustomException(ErrorCode.USER_NOT_FOUND);
    }
    Object.assign(user, updateUserDto);
    const savedUser = await this.userRepository.save(user);
    return UserMapper.toResponseDto(savedUser);
  }

  async remove(userId: number): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. 사용자 존재 여부 확인
      const user = await queryRunner.manager.findOne(User, { where: { userId } });
      if (!user) {
        throw new CustomException(ErrorCode.USER_NOT_FOUND);
      }

      // 2. 연관된 문서 Soft Delete
      await queryRunner.manager.softDelete(Document, { userId });

      // 3. 연관된 부동산 Soft Delete
      await queryRunner.manager.softDelete(Estate, { userId });

      // 4. 사용자 Soft Delete
      await queryRunner.manager.softDelete(User, { userId });

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async deleteUsers(userIds: number[]): Promise<void> {
    if (userIds.length === 0) return;

    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. 연관된 문서 Soft Delete
      await queryRunner.manager.softDelete(Document, { userId: In(userIds) });

      // 2. 연관된 부동산 Soft Delete
      await queryRunner.manager.softDelete(Estate, { userId: In(userIds) });

      // 3. 사용자 Soft Delete
      await queryRunner.manager.softDelete(User, { userId: In(userIds) });

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 사용자의 약관 동의를 저장
   * @param dto 약관 동의 요청 DTO
   * @param userId 사용자 ID
   * @returns 저장된 사용자 정보
   */
  async agreeTerms(dto: AgreeTermsRequestDto, userId: number): Promise<User> {
    // 약관 형식 검증
    this.termsValidator.validateTermsFormat(dto.agreedTerms);

    // 사용자 조회
    const user = await this.userRepository.findOneBy({ userId });
    if (!user) {
      throw new CustomException(ErrorCode.USER_NOT_FOUND);
    }

    // 이미 약관에 동의했는지 확인
    this.termsValidator.validateNotAlreadyAgreed(user.agreedTerms);

    // 필수 약관 동의 확인
    await this.termsValidator.validateRequiredTerms(dto.agreedTerms);

    // 약관 동의 정보 저장
    try {
      user.agreedTerms = dto.agreedTerms;
      const savedUser = await this.userRepository.save(user);
      return savedUser;
    } catch (error) {
      // 데이터베이스 오류 처리
      throw new CustomException(ErrorCode.DATABASE_ERROR);
    }
  }
}
