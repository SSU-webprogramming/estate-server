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
import { EstateAnalysisReportCacheService } from '@/modules/estate-analysis-report/services/estate-analysis-report-cache.service';
import { EstateAnalysisReportMapper } from '@/modules/estate-analysis-report/mapper/estate-analysis-report.mapper';
import { GetUser } from '@/modules/auth/decorators/get-user.decorator';
import { User } from '@/modules/user/entities/user.entity';

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
    @GetUser() user: User,
    @Body() createEstateAnalysisDto: CreateEstateAnalysisDto,
  ): Promise<EstateAnalysisReportResponseDto> {
    const analysisReport =
      await this.estateAnalysisReportService.analyzeEstateWithDocuments(
        user.userId,
        createEstateAnalysisDto,
      );

    // 새 분석이 생성되었으므로 해당 부동산 ID 캐시 무효화
    if (analysisReport.estateId) {
      await this.estateAnalysisReportCacheService.invalidate(
        analysisReport.estateId,
      );
    }

    return EstateAnalysisReportMapper.toResponseDto(analysisReport);
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
