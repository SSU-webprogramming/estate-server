import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from '@/modules/user/dto/request/create-user.dto';
import { UpdateUserDto } from '@/modules/user/dto/request/update-user.dto';
import { User } from '@/modules/user/entities/user.entity';
import { ProviderType } from '@/common/enums/provider-type.enum';
import { CustomException } from '@/common/errors/custom-exception';
import { ErrorCode } from '@/common/errors/error';
import { GetUserListDto } from '../dto/request/get-user-list.dto';
import {
  PaginationResponseDto,
  PaginationMetaDto,
} from '@/common/dto/pagination-response.dto';
import { UserResponseDto } from '../dto/response/user-response.dto';
import { UserMapper } from '../mapper/user.mapper';
import { Like } from 'typeorm';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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

  async findOne(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) {
      throw new CustomException(ErrorCode.USER_NOT_FOUND);
    }
    return user;
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

  async update(userId: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(userId);
    Object.assign(user, updateUserDto);
    return this.userRepository.save(user);
  }

  async remove(userId: number): Promise<void> {
    const result = await this.userRepository.delete(userId);
    if (result.affected === 0) {
      throw new CustomException(ErrorCode.USER_NOT_FOUND);
    }
  }

  async deleteUsers(userIds: number[]): Promise<void> {
    if (userIds.length === 0) return;
    await this.userRepository.delete(userIds);
  }
}
