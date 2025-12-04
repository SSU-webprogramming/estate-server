import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EstateService } from '../services/estate.service';
import { CreateEstateDto } from '../dto/request/create-estate.dto';
import { EstateResponseDto } from '../dto/response/estate-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';
import {
  ApiEstateController,
  ApiCreateEstate,
} from './estate.api';

/**
 * 부동산 컨트롤러
 * 부동산 관련 API 엔드포인트를 제공합니다.
 */
@ApiEstateController()
@Controller('estates')
export class EstateController {
  constructor(private readonly estateService: EstateService) {}

  // @Post()
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  // @HttpCode(HttpStatus.CREATED)
  // @ApiOperation({
  //   summary: '부동산 정보 등록',
  //   description: '현재 로그인한 사용자와 연관된 부동산 정보를 등록합니다.',
  // })
  // @ApiBody({
  //   type: CreateEstateDto,
  //   description: '등록할 부동산 정보',
  // })
  // @ApiResponse({
  //   status: 201,
  //   description: '부동산 정보가 성공적으로 등록되었습니다.',
  //   type: EstateResponseDto,
  // })
  // @ApiResponse({
  //   status: 400,
  //   description: '잘못된 요청 데이터입니다.',
  // })
  // @ApiResponse({
  //   status: 401,
  //   description: '인증이 필요합니다.',
  // })
  // async create(
  //   @Req() req: RequestWithUser,
  //   @Body() createEstateDto: CreateEstateDto,
  // ): Promise<EstateResponseDto> {
  //   const estate = await this.estateService.create(
  //     req.user.userId,
  //     createEstateDto,
  //   );
  //   return this.mapToResponseDto(estate);
  // }

  // /**
  //  * Estate 엔티티를 EstateResponseDto로 변환
  //  */
  // private mapToResponseDto(estate: any): EstateResponseDto {
  //   return {
  //     estateId: estate.estateId,
  //     userId: estate.userId,
  //     address: estate.address,
  //     addressDetail: estate.addressDetail,
  //     contractType: estate.contractType,
  //     deposit: estate.deposit,
  //     monthlyRent: estate.monthlyRent,
  //     kbMarketPrice: estate.kbMarketPrice,
  //     createdAt: estate.createdAt,
  //     updatedAt: estate.updatedAt,
  //   };
  // }
}
