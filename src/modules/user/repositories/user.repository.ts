import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

export class UserRepository extends Repository<User> {
  async findByUsername(username: string): Promise<User | null> {
    return this.findOne({ where: { username } });
  }
}
