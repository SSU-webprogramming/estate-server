import { User } from '@/modules/user/entities/user.entity';
import { ProviderType } from '@/common/enums/provider-type.enum';
import { GetUserListDto } from '@/modules/user/dto/request/get-user-list.dto';

export abstract class IUserRepository {
  abstract findAll(): Promise<User[]>;

  abstract findAllWithPagination(
    getUserListDto: GetUserListDto,
  ): Promise<[User[], number]>;

  abstract findOne(userId: number): Promise<User | null>;

  abstract findByEmail(email: string): Promise<User | null>;

  abstract findByProvider(
    providerType: ProviderType,
    providerId: string,
  ): Promise<User | null>;

  abstract findOneBy(where: { userId: number }): Promise<User | null>;

  abstract save(user: User): Promise<User>;

  abstract remove(userId: number): Promise<void>;

  abstract deleteUsers(userIds: number[]): Promise<void>;
}
