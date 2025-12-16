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
import { ErrorHandler } from '@/common/utils/error-handler.util';

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
    const meta = new PaginationMetaDto(getUserListDto.page, getUserListDto.limit, total);

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
    const user = await this.findUserOrThrow(userId);
    
    Object.assign(user, updateUserDto);
    const savedUser = await this.userRepository.save(user);
    
    return UserMapper.toResponseDto(savedUser);
  }

  async remove(userId: number): Promise<void> {
    await this.findUserOrThrow(userId);
    await this.userRepository.remove(userId);
  }

  private async findUserOrThrow(userId: number): Promise<any> {
    const user = await this.userRepository.findOne(userId);
    if (!user) {
      throw new CustomException(ErrorCode.USER_NOT_FOUND);
    }
    return user;
  }

  async deleteUsers(userIds: number[]): Promise<void> {
    await this.userRepository.deleteUsers(userIds);
  }


  async agreeTerms(dto: AgreeTermsRequestDto, userId: number): Promise<Record<string, boolean>> {
    const user = await this.findUserForTermsAgreement(userId);
    
    this.termsValidator.validateNotAlreadyAgreed(user.agreedTerms);
    await this.termsValidator.validateRequiredTerms(dto.agreedTerms);

    user.agreedTerms = dto.agreedTerms;
    const savedUser = await this.saveUserTermsAgreement(user);
    
    return savedUser.agreedTerms || {};
  }

  private async findUserForTermsAgreement(userId: number): Promise<any> {
    const user = await ErrorHandler.handleDatabaseOperation(
      () => this.userRepository.findOneBy({ userId }),
      '사용자 조회',
    );

    if (!user) {
      throw new CustomException(ErrorCode.USER_NOT_FOUND);
    }

    return user;
  }

  private async saveUserTermsAgreement(user: any): Promise<any> {
    return ErrorHandler.handleDatabaseOperation(
      () => this.userRepository.save(user),
      '사용자 약관 동의 저장',
    );
  }
}