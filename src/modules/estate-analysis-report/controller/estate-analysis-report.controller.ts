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
    @Req() req: RequestWithUser,
    @Body() createEstateAnalysisDto: CreateEstateAnalysisDto,
  ): Promise<EstateAnalysisReport> {
    return this.estateAnalysisReportService.analyzeEstateWithDocuments(
      req.user.userId,
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
    const analysisReport =
      await this.estateAnalysisReportService.findByEstateId(estateId);

    if (!analysisReport) {
      // 분석이 완료되지 않은 경우 빈 DTO 반환
      return this.mapToEmptyResponseDto();
    }

    // 분석이 완료된 경우 결과를 DTO로 변환하여 반환
    return this.mapToResponseDto(analysisReport);
  }

  /**
   * EstateAnalysisReport 엔티티를 ResponseDto로 변환
   */
  private mapToResponseDto(
    report: EstateAnalysisReport,
  ): EstateAnalysisReportResponseDto {
    return {
      id: report.id,
      estateId: report.estateId,
      analyzedAt: report.analyzedAt,
      safetyScore: report.safetyScore,
      address: report.address,
      buildingStructure: report.buildingStructure,
      buildingUsage: report.buildingUsage,
      totalFloors: report.totalFloors,
      totalLandArea: report.totalLandArea,
      exclusiveArea: report.exclusiveArea,
      landRightRatio: report.landRightRatio,
      hasSeparateRegistration: report.hasSeparateRegistration,
      isIllegalConstruction: report.isIllegalConstruction,
      ownershipStatus: report.ownershipStatus,
      currentOwner: report.currentOwner,
      transferDate: report.transferDate,
      transferCause: report.transferCause,
      pastOwnerChangeCount: report.pastOwnerChangeCount,
      hasOwnershipRestriction: report.hasOwnershipRestriction,
      titleSectionAnalysisSummary: report.titleSectionAnalysisSummary,
      titleSectionAnalysisResult: report.titleSectionAnalysisResult,
      ownershipSectionAnalysisSummary: report.ownershipSectionAnalysisSummary,
      ownershipSectionAnalysisResult: report.ownershipSectionAnalysisResult,
      rightsSectionAnalysisSummary: report.rightsSectionAnalysisSummary,
      rightsSectionAnalysisResult: report.rightsSectionAnalysisResult,
      rightsAnalysisSummary: report.rightsAnalysisSummary,
      recommendedContractClauses: report.recommendedContractClauses,
      isInsuranceEligible: report.isInsuranceEligible,
      insuranceAnalysisReasons: report.insuranceAnalysisReasons,
      recommendedInsuranceCompanies: report.recommendedInsuranceCompanies,
    } as unknown as EstateAnalysisReportResponseDto;
  }

  /**
   * 빈 ResponseDto 반환 (분석이 완료되지 않은 경우)
   */
  private mapToEmptyResponseDto(): EstateAnalysisReportResponseDto {
    return {
      id: null,
      estateId: null,
      analyzedAt: null,
      safetyScore: null,
      address: null,
      buildingStructure: null,
      buildingUsage: null,
      totalFloors: null,
      totalLandArea: null,
      exclusiveArea: null,
      landRightRatio: null,
      hasSeparateRegistration: null,
      isIllegalConstruction: null,
      ownershipStatus: null,
      currentOwner: null,
      transferDate: null,
      transferCause: null,
      pastOwnerChangeCount: null,
      hasOwnershipRestriction: null,
      titleSectionAnalysisSummary: null,
      titleSectionAnalysisResult: null,
      ownershipSectionAnalysisSummary: null,
      ownershipSectionAnalysisResult: null,
      rightsSectionAnalysisSummary: null,
      rightsSectionAnalysisResult: null,
      rightsAnalysisSummary: null,
      recommendedContractClauses: null,
      isInsuranceEligible: null,
      insuranceAnalysisReasons: null,
      recommendedInsuranceCompanies: null,
    } as unknown as EstateAnalysisReportResponseDto;
  }
}
