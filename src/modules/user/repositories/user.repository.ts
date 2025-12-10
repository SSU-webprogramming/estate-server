import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Like } from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { Estate } from '@/modules/estate/entities/estate.entity';
import { Document } from '@/modules/document/entities/document.entity';
import { ProviderType } from '@/common/enums/provider-type.enum';
import { GetUserListDto } from '@/modules/user/dto/request/get-user-list.dto';

@Injectable()
export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly repository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(): Promise<User[]> {
    return this.repository.find();
  }

  async findAllWithPagination(
    getUserListDto: GetUserListDto,
  ): Promise<[User[], number]> {
    const where: any = {};
    if (getUserListDto.name) {
      where.username = Like(`%${getUserListDto.name}%`);
    }
    if (getUserListDto.email) {
      where.email = Like(`%${getUserListDto.email}%`);
    }

    return this.repository.findAndCount({
      where,
      skip: getUserListDto.skip,
      take: getUserListDto.limit,
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findOne(userId: number): Promise<User | null> {
    return this.repository.findOne({ where: { userId } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.repository.findOne({ where: { email } });
  }

  async findByProvider(
    providerType: ProviderType,
    providerId: string,
  ): Promise<User | null> {
    return this.repository.findOne({ where: { providerType, providerId } });
  }

  async findOneBy(where: { userId: number }): Promise<User | null> {
    return this.repository.findOneBy(where);
  }

  async save(user: User): Promise<User> {
    return this.repository.save(user);
  }

  async remove(userId: number): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. 사용자 존재 여부 확인
      const user = await queryRunner.manager.findOne(User, { where: { userId } });
      if (!user) {
        throw new Error('User not found');
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
}