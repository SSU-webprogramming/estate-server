import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';
import { User } from './entities/user.entity';
import { AuthModule } from '@/modules/auth/auth.module';
import { TermModule } from '@/modules/term/term.module';
import { TermsValidator } from './validators/terms-validator';
import { UserRepository } from './repositories/user.repository';

@Module({
  imports: [TypeOrmModule.forFeature([User]), AuthModule, TermModule],
  controllers: [UserController],
  providers: [UserService, TermsValidator, UserRepository],
  exports: [UserService],
})
export class UserModule {}
