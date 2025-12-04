import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EstateAnalysisReportService } from '../services/estate-analysis-report.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import type { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';
import { CreateEstateAnalysisDto } from '../dto/req/estate-analysis-req.dto';
import { EstateAnalysisReport } from '../entities/estate-analysis-report.entity';
import { EstateAnalysisReportResponseDto } from '../dto/res/estate-analysis-report-response.dto';
import {
  ApiEstateAnalysisReportController,
  ApiAnalyzeEstate,
  ApiGetAnalysisResult,
} from './estate-analysis-report.api';
import { EstateAnalysisReportCacheService } from '../services/estate-analysis-report-cache.service';
import { EstateAnalysisReportMapper } from '../mapper/estate-analysis-report.mapper';

@ApiEstateAnalysisReportController()
@Controller('estate-analysis')
export class EstateAnalysisReportController {
  constructor(
    private readonly estateAnalysisReportService: EstateAnalysisReportService,
    private readonly estateAnalysisReportCacheService: EstateAnalysisReportCacheService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiAnalyzeEstate()
  async analyzeEstate(
    @Req() req: RequestWithUser,
    @Body() createEstateAnalysisDto: CreateEstateAnalysisDto,
  ): Promise<EstateAnalysisReport> {
    const analysisReport =
      await this.estateAnalysisReportService.analyzeEstateWithDocuments(
        req.user.userId,
        createEstateAnalysisDto,
      );

    // 새 분석이 생성되었으므로 해당 부동산 ID 캐시 무효화
    if (analysisReport.estateId) {
      await this.estateAnalysisReportCacheService.invalidate(
        analysisReport.estateId,
      );
    }

    return analysisReport;
  }

  @Get(':estateId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiGetAnalysisResult()
  async getAnalysisResult(
    @Param('estateId', ParseIntPipe) estateId: number,
  ): Promise<EstateAnalysisReportResponseDto> {
    // 1. 캐시 조회
    const cached =
      await this.estateAnalysisReportCacheService.get(estateId);
    if (cached) {
      return cached;
    }

    // 2. DB 조회
    const analysisReport =
      await this.estateAnalysisReportService.findByEstateId(estateId);

    if (!analysisReport) {
      // 분석이 완료되지 않은 경우 빈 DTO 반환
      return EstateAnalysisReportMapper.emptyResponse();
    }

    // 분석이 완료된 경우 결과를 DTO로 변환하여 반환
    const responseDto =
      EstateAnalysisReportMapper.toResponseDto(analysisReport);

    // 3. 캐시에 저장
    await this.estateAnalysisReportCacheService.set(estateId, responseDto);

    return responseDto;
  }

}
