import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EstateAnalysisReportService } from '../services/estate-analysis-report.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CustomException } from 'src/common/errors/custom-exception';
import { ErrorCode } from 'src/common/errors/error';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('분석')
@Controller()
export class EstateAnalysisReportController {
  constructor(
    private readonly documentAnalyzerService: EstateAnalysisReportService,
  ) {}

  @Post('estate-analyzer')
  @UseInterceptors(FileInterceptor('file') as any)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '문서(PDF 또는 JPG) 업로드 및 분석' })
  @ApiResponse({
    status: 200,
    description: '문서가 성공적으로 분석되었습니다.',
    type: String,
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 또는 지원하지 않는 파일 형식입니다.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async analyzeDocument(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }), // 5MB limit
          new FileTypeValidator({
            fileType: new RegExp('application/pdf|image/jpeg'),
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<string> {
    if (!file) {
      throw new CustomException(ErrorCode.FILE_NOT_FOUND);
    }
    return this.documentAnalyzerService.analyzeDocument(
      file.buffer,
      file.mimetype,
    );
  }
}
