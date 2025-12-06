import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EstateService } from '@/modules/estate/services/estate.service';
import { CreateEstateDto } from '@/modules/estate/dto/request/create-estate.dto';
import { EstateResponseDto } from '@/modules/estate/dto/response/estate-response.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import {
  ApiEstateController,
  ApiCreateEstate,
} from '@/modules/estate/swagger/estate.api';
import { ApiBearerAuth } from '@nestjs/swagger';
import { GetUser } from '@/modules/auth/decorators/get-user.decorator';
import { User } from '@/modules/user/entities/user.entity';
/**
 * 부동산 컨트롤러
 * 부동산 관련 API 엔드포인트를 제공합니다.
 */
@ApiEstateController()
@Controller('estates')
export class EstateController {
  constructor(private readonly estateService: EstateService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @GetUser() user: User,
    @Body() createEstateDto: CreateEstateDto,
  ): Promise<EstateResponseDto> {
    const estateResponse = await this.estateService.create(
      user.userId,
      createEstateDto,
    );
    return estateResponse;
  }
}
