import { Controller, Get, Post, Body, Patch, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { TermService } from './term.service';
import { CreateTermDto } from './dto/request/create-term.dto';
import { UpdateTermDto } from './dto/request/update-term.dto';
import { TermResponseDto } from './dto/response/term-response.dto';
import {
  ApiTermController,
  ApiGetTerms,
  ApiCreateTerm,
  ApiUpdateTerm,
  ApiGetAgreedTerms,
} from './swagger/term.api';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../user/entities/user.entity';
import { UserRole } from '@/common/enums/user-role.enum';

@ApiTermController()
@Controller('terms')
export class TermController {
  constructor(private readonly termService: TermService) {}

  @Get()
  @ApiGetTerms()
  @UseGuards(JwtAuthGuard, RolesGuard)
  async findAll(): Promise<TermResponseDto[]> {
    return this.termService.findAll();
  }

  @Get('agreed')
  @ApiGetAgreedTerms()
  @UseGuards(JwtAuthGuard)
  async findAgreedTerms(@GetUser() user: User): Promise<TermResponseDto[]> {
    return this.termService.findAgreedTerms(user);
  }

  @Post()
  @ApiCreateTerm()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreateTermDto): Promise<TermResponseDto> {
    return this.termService.create(dto);
  }

  @Patch(':id')
  @ApiUpdateTerm()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTermDto,
  ): Promise<TermResponseDto> {
    return this.termService.update(id, dto);
  }
}
