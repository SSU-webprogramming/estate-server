import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async validateAndSaveUser(
    provider: string,
    providerId: string,
    username: string,
    email: string,
    birthdate: string,
    gender: string,
    accessToken: string,
    refreshToken: string,
  ): Promise<User> {
    let user = await this.userRepository.findOne({ where: { provider, providerId } });

    if (user) {
      // Update tokens for existing user
      user.accessToken = accessToken;
      user.refreshToken = refreshToken;
    } else {
      // Create new user with tokens
      user = this.userRepository.create({
        provider,
        providerId,
        username,
        email,
        birthdate,
        gender,
        accessToken,
        refreshToken,
      });
    }

    return this.userRepository.save(user);
  }

  async login(user: User) {
    const payload = { username: user.username, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
