import {
  Controller,
  Get,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { UserService } from '@/modules/user/services/user.service';
import { UpdateUserDto } from '@/modules/user/dto/request/update-user.dto';
import { UserResponseDto } from '@/modules/user/dto/response/user-response.dto';
import { UserMapper } from '@/modules/user/mapper/user.mapper';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import {
  ApiUserController,
  ApiFindAllUsers,
  ApiFindOneUser,
  ApiUpdateUser,
  ApiDeleteUser,
} from '@/modules/user/swagger/user.api';

@ApiUserController()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiFindAllUsers()
  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.userService.findAll();
    return UserMapper.toResponseDtoList(users);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiFindOneUser()
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.userService.findOne(+id);
    return UserMapper.toResponseDto(user);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiUpdateUser()
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.userService.update(+id, updateUserDto);
    return UserMapper.toResponseDto(user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiDeleteUser()
  remove(@Param('id') id: string): Promise<void> {
    return this.userService.remove(+id);
  }
}