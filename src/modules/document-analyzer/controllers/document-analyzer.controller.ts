import { Controller, Post, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentAnalyzerService } from '../services/document-analyzer.service';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { CustomException } from 'src/common/errors/custom-exception';
import { ErrorCode } from 'src/common/errors/error';

@ApiTags('문서 분석기')
@Controller('document-analyzer')
export class DocumentAnalyzerController {
  constructor(private readonly documentAnalyzerService: DocumentAnalyzerService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '분석을 위해 PDF 또는 JPG 문서 업로드' })
  @ApiResponse({ status: 200, description: '문서가 성공적으로 분석되었습니다.', type: String })
  @ApiResponse({ status: 400, description: '잘못된 요청 또는 지원하지 않는 파일 형식입니다.' })
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
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }), // 5MB limit
          new FileTypeValidator({ fileType: new RegExp('application/pdf|image/jpeg') }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<string> {
    if (!file) {
      throw new CustomException(ErrorCode.FILE_NOT_FOUND)
    }
    return this.documentAnalyzerService.analyzeDocument(file.buffer, file.mimetype);
  }
}