import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException, UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentAnalyzerService } from '../services/document-analyzer.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { CustomException } from 'src/common/errors/custom-exception';
import { ErrorCode } from 'src/common/errors/error';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Analyses')
@Controller('analyses')
export class DocumentAnalyzerController {
  constructor(
    private readonly documentAnalyzerService: DocumentAnalyzerService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file') as any)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Upload a document (PDF or JPG) for analysis' })
  @ApiResponse({
    status: 200,
    description: 'The document was successfully analyzed.',
    type: String,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request or unsupported file type.',
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
