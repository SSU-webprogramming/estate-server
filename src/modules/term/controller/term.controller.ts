import { Controller, Get, Post, Body, Patch, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { TermService } from '@/modules/term/service/term.service';
import { CreateTermDto } from '@/modules/term/dto/request/create-term.dto';
import { UpdateTermDto } from '@/modules/term/dto/request/update-term.dto';
import { TermResponseDto } from '@/modules/term/dto/response/term-response.dto';
import {
  ApiTermController,
  ApiGetTerms,
  ApiCreateTerm,
  ApiUpdateTerm,
  ApiGetAgreedTerms,
} from '@/modules/term/swagger/term.api';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { GetUser } from '@/modules/auth/decorators/get-user.decorator';
import { User } from '@/modules/user/entities/user.entity';
import { UserRole } from '@/common/enums/user-role.enum';

@ApiTermController()
@Controller('terms')
export class TermController {
  constructor(private readonly termService: TermService) {}

  @Get()
  @ApiGetTerms()
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
