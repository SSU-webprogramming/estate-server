import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../../user/services/user.service';
import { User } from '../../user/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(provider: string, providerId: string, username: string, email: string): Promise<User> {
    let user = await this.userService.findByProvider(provider, providerId);

    if (!user) {
      const newUser = this.userService.userRepository.create({
        provider,
        providerId,
        username,
        email,
      });
      user = await this.userService.userRepository.save(newUser);
    }

    return user;
  }

  async login(user: User) {
    const payload = { username: user.username, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
