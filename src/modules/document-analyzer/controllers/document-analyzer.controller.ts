import { Controller, Post, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentAnalyzerService } from '../services/document-analyzer.service';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';

@ApiTags('document-analyzer')
@Controller('document-analyzer')
export class DocumentAnalyzerController {
  constructor(private readonly documentAnalyzerService: DocumentAnalyzerService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a PDF or JPG document for analysis' })
  @ApiResponse({ status: 200, description: 'Document analyzed successfully.', type: String })
  @ApiResponse({ status: 400, description: 'Bad Request or unsupported file type.' })
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
      throw new BadRequestException('No file uploaded.');
    }
    return this.documentAnalyzerService.analyzeDocument(file.buffer, file.mimetype);
  }
}