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
} from '@nestjs/common';
import { EstateAnalysisReportService } from '@/modules/estate-analysis-report/services/estate-analysis-report.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { CreateEstateAnalysisDto } from '@/modules/estate-analysis-report/dto/req/estate-analysis-req.dto';
import { EstateAnalysisReportResponseDto } from '@/modules/estate-analysis-report/dto/res/estate-analysis-report-response.dto';
import {
  ApiEstateAnalysisReportController,
  ApiAnalyzeEstate,
  ApiGetAnalysisResult,
} from '../swagger/estate-analysis-report.api';
import { EstateAnalysisReportMapper } from '@/modules/estate-analysis-report/mapper/estate-analysis-report.mapper';
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

}
