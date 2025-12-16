import {
  Controller,
  Get,
  Body,
  Param,
  Put,
  Delete,
  Post,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
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
  ApiDeleteUsers,
  ApiAgreeTerms,
} from '@/modules/user/swagger/user.api';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { UserRole } from '@/common/enums/user-role.enum';
import { DeleteUsersDto } from '@/modules/user/dto/request/delete-users.dto';
import { GetUserListDto } from '@/modules/user/dto/request/get-user-list.dto';
import { PaginationResponseDto } from '@/common/dto/pagination-response.dto';
import { AgreeTermsRequestDto } from '@/modules/user/dto/request/agree-term.dto';
import { AgreeTermsResponseDto } from '@/modules/user/dto/response/agree-terms-response.dto';
import { GetUser } from '@/modules/auth/decorators/get-user.decorator';
import { User } from '@/modules/user/entities/user.entity';

@ApiUserController()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('agreed-terms')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiAgreeTerms()
  async agreeTerms(
    @Body() agreeTermsRequestDto: AgreeTermsRequestDto,
    @GetUser() user: User,
  ): Promise<AgreeTermsResponseDto> {
    const agreedTerms = await this.userService.agreeTerms(agreeTermsRequestDto, user.userId);
    return new AgreeTermsResponseDto(agreedTerms);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiFindAllUsers()
  async findAll(
    @Query() getUserListDto: GetUserListDto,
  ): Promise<PaginationResponseDto<UserResponseDto>> {
    return this.userService.findAllWithPagination(getUserListDto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiFindOneUser()
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    return this.userService.findOne(+id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiUpdateUser()
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.userService.update(+id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.USER)
  @ApiDeleteUser()
  remove(@Param('id') id: string): Promise<void> {
    return this.userService.remove(+id);
  }

  @Delete()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiDeleteUsers()
  deleteUsers(@Body() deleteUsersDto: DeleteUsersDto): Promise<void> {
    return this.userService.deleteUsers(deleteUsersDto.userIds);
  }
}