import { Injectable } from '@nestjs/common';
import { UpdateUserDto } from '@/modules/user/dto/request/update-user.dto';
import { User } from '@/modules/user/entities/user.entity';
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
import { AgreeTermsRequestDto } from '@/modules/user/dto/request/agree-term.dto';
import { TermsValidator } from '@/modules/user/validators/terms-validator';
import { UserRepository } from '@/modules/user/repositories/user.repository';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly termsValidator: TermsValidator,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.findAll();
  }

  async findAllWithPagination(
    getUserListDto: GetUserListDto,
  ): Promise<PaginationResponseDto<UserResponseDto>> {
    const [users, total] = await this.userRepository.findAllWithPagination(getUserListDto);

    const userDtos = UserMapper.toResponseDtoList(users);
    const meta = new PaginationMetaDto(
      getUserListDto.page,
      getUserListDto.limit,
      total,
    );

    return new PaginationResponseDto(userDtos, meta);
  }

  async findOne(userId: number): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new CustomException(ErrorCode.USER_NOT_FOUND);
    }
    return UserMapper.toResponseDto(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async findByProvider(
    providerType: ProviderType,
    providerId: string,
  ): Promise<User | null> {
    return this.userRepository.findByProvider(providerType, providerId);
  }

  async update(userId: number, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new CustomException(ErrorCode.USER_NOT_FOUND);
    }
    Object.assign(user, updateUserDto);
    const savedUser = await this.userRepository.save(user);
    return UserMapper.toResponseDto(savedUser);
  }

  async remove(userId: number): Promise<void> {
    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new CustomException(ErrorCode.USER_NOT_FOUND);
    }
    await this.userRepository.remove(userId);
  }

  async deleteUsers(userIds: number[]): Promise<void> {
    await this.userRepository.deleteUsers(userIds);
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