import {
  Controller,
  Get,
  Post,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  UseGuards,
  Req,
  Sse,
  MessageEvent,
  Headers,
  Header,
  Query,
  ParseArrayPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentService } from '../services/document.service';
import { AuthGuard } from '@nestjs/passport';
import type { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Observable } from 'rxjs';

@ApiTags('Documents')
@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a document for later analysis' })
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
  async uploadDocument(
    @Req() req: RequestWithUser,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 10 }), // 10MB limit
          new FileTypeValidator({
            fileType: new RegExp('application/pdf|image/jpeg|image/png'),
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const { user } = req;
    return this.documentService.uploadAndCreateDocument(user, file);
  }

  @Get('analyze/stream')
  @Sse()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Header('Content-Type', 'text/event-stream')
  @Header('Cache-Control', 'no-cache, no-transform')
  @Header('Connection', 'keep-alive')
  @Header('X-Accel-Buffering', 'no')
  @ApiOperation({
    summary: 'Analyze selected user documents and stream results',
  })
  @ApiQuery({
    name: 'documentIds',
    type: [Number],
    description: '분석할 문서 ID 목록 (쉼표로 구분)',
    required: false,
  })
  analyzeDocumentsStream(
    @Req() req: RequestWithUser,
    @Query('documentIds', new ParseArrayPipe({ items: Number, optional: true }))
    documentIds?: number[],
  ): Observable<MessageEvent> {
    const { user } = req;
    return this.documentService.analyzeUserDocuments(user, documentIds);
  }
}
