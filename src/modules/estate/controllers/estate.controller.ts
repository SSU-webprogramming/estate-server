import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
  Query,
  Delete,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { EstateService } from '@/modules/estate/services/estate.service';
import { CreateEstateDto } from '@/modules/estate/dto/request/create-estate.dto';
import { EstateResponseDto } from '@/modules/estate/dto/response/estate-response.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { GetEstateListDto } from '@/modules/estate/dto/request/get-estate-list.dto';
import { PaginationResponseDto } from '@/common/dto/pagination-response.dto';
import {
  ApiEstateController,
  ApiCreateEstate,
  ApiGetEstateList,
  ApiDeleteEstate,
} from '@/modules/estate/swagger/estate.api';
import { ApiBearerAuth } from '@nestjs/swagger';
import { GetUser } from '@/modules/auth/decorators/get-user.decorator';
import { User } from '@/modules/user/entities/user.entity';

@ApiEstateController()
@Controller('estates')
export class EstateController {
  constructor(private readonly estateService: EstateService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreateEstate()
  async create(
    @GetUser() user: User,
    @Body() createEstateDto: CreateEstateDto,
  ): Promise<EstateResponseDto> {
    return this.estateService.create(user.userId, createEstateDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiGetEstateList()
  async findAll(
    @GetUser() user: User,
    @Query() getEstateListDto: GetEstateListDto,
  ): Promise<PaginationResponseDto<EstateResponseDto>> {
    return this.estateService.findAllWithPagination(user.userId, getEstateListDto);
  }

  @Delete(':estateId')
  @UseGuards(JwtAuthGuard)
  @ApiDeleteEstate()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @GetUser() user: User,
    @Param('estateId', ParseIntPipe) estateId: number,
  ): Promise<void> {
    await this.estateService.deleteEstate(user.userId, estateId);
  }
}
