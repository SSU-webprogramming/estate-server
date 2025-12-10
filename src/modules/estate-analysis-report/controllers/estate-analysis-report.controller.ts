import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { HttpCacheInterceptor } from '@/common/interceptors/http-cache.interceptor';
import { CacheTTL } from '@nestjs/cache-manager';
import { EstateAnalysisReportService } from '@/modules/estate-analysis-report/services/estate-analysis-report.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CreateEstateAnalysisDto } from '@/modules/estate-analysis-report/dto/request/estate-analysis-req.dto';
import { SearchEstateAnalysisDto } from '@/modules/estate-analysis-report/dto/request/search-estate-analysis.dto';
import { EstateAnalysisReportResponseDto } from '@/modules/estate-analysis-report/dto/response/estate-analysis-report-response.dto';
import { PaginationResponseDto } from '@/common/dto/pagination-response.dto';
import {
  ApiEstateAnalysisReportController,
  ApiAnalyzeEstate,
  ApiGetAnalysisResult,
  ApiSearchEstateAnalysis,
} from '@/modules/estate-analysis-report/swagger/estate-analysis-report.api';
import { GetUser } from '@/modules/auth/decorators/get-user.decorator';
import { User } from '@/modules/user/entities/user.entity';

@ApiEstateAnalysisReportController()
@Controller('estate-analysis')
export class EstateAnalysisReportController {
  constructor(
    private readonly estateAnalysisReportService: EstateAnalysisReportService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiAnalyzeEstate()
  async analyzeEstate(
    @GetUser() user: User,
    @Body() createEstateAnalysisDto: CreateEstateAnalysisDto,
  ): Promise<EstateAnalysisReportResponseDto> {
    return this.estateAnalysisReportService.analyzeEstateWithDocuments(
      user.userId,
      createEstateAnalysisDto,
    );
  }

  @Get(':estateId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiGetAnalysisResult()
  async getAnalysisResult(
    @Param('estateId', ParseIntPipe) estateId: number,
  ): Promise<EstateAnalysisReportResponseDto> {
    return this.estateAnalysisReportService.getAnalysisResult(estateId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(HttpCacheInterceptor)
  @CacheTTL(1200)
  @ApiSearchEstateAnalysis()
  async findAll(
    @GetUser() user: User,
    @Query() query: SearchEstateAnalysisDto,
  ): Promise<PaginationResponseDto<EstateAnalysisReportResponseDto>> {
    return this.estateAnalysisReportService.findAll(user.userId, query);
  }
}

