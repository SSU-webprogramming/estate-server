import { User } from '@/modules/user/entities/user.entity';
import { UserResponseDto } from '@/modules/user/dto/response/user-response.dto';
import { KakaoRegisterInfo } from '@/modules/auth/interfaces/request-with-user.interface';

export class UserMapper {
  static toResponseDto(user: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.userId = user.userId;
    dto.email = user.email;
    dto.username = user.username;
    dto.providerType = user.providerType;
    dto.role = user.role;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    return dto;
  }

  static toResponseDtoList(users: User[]): UserResponseDto[] {
    return users.map((user) => this.toResponseDto(user));
  }

  static fromKakaoRegisterInfo(info: KakaoRegisterInfo): User {
    const user = new User();
    user.email = info.email;
    user.username = info.username;
    user.providerType = info.providerType;
    user.providerId = info.providerId;
    user.role = 'USER';
    return user;
  }
}
