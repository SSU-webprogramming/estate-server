import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { UserService } from '../services/user.service';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '../entities/user.entity';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('사용자')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '모든 사용자 조회' })
  @ApiResponse({
    status: 200,
    description: '모든 사용자를 반환합니다.',
    type: [User],
  })
  findAll(): Promise<User[]> {
    return this.userService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ID로 사용자 조회' })
  @ApiResponse({
    status: 200,
    description: '단일 사용자를 반환합니다.',
    type: User,
  })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없습니다.' })
  findOne(@Param('id') id: string): Promise<User> {
    return this.userService.findOne(+id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ID로 사용자 업데이트' })
  @ApiResponse({
    status: 200,
    description: '사용자가 성공적으로 업데이트되었습니다.',
    type: User,
  })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없습니다.' })
  @ApiBody({ type: UpdateUserDto })
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.userService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ID로 사용자 삭제' })
  @ApiResponse({
    status: 204,
    description: '사용자가 성공적으로 삭제되었습니다.',
  })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없습니다.' })
  remove(@Param('id') id: string): Promise<void> {
    return this.userService.remove(+id);
  }
}
