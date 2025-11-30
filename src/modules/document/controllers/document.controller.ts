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
  Header,
  Query,
  ParseArrayPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentService } from '../services/document.service';
import { DocumentType } from '../entities/document.entity';
import type { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { UploadDocumentDto } from '../dto/req/upload-document.dto';
import { DocumentResponseDto } from '../dto/res/document-response.dto';


@ApiTags('문서')
@Controller()
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post("documents")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file') as any)
  @ApiOperation({ summary: '문서 업로드 (추후 분석용)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        }
      },
    },
  })
  @ApiQuery({
    name: 'docType',
    type: String,
    description: '문서 타입 (1: 등기부등본, 2: 토지대장)',
    required: false,
    enum: DocumentType,
  })
  @ApiResponse({
    status: 201,
    description: '문서 업로드 성공',
    type: DocumentResponseDto,
  })
  async uploadDocument(
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
    @Query() uploadDocumentDto: UploadDocumentDto,
  ): Promise<DocumentResponseDto> {
    const document = await this.documentService.uploadAndCreateDocument(file, uploadDocumentDto.docType);
    return document;
  }

  // @Get('documents/analyze/stream')
  // @Sse()
  // @UseGuards(JwtAuthGuard)
  // @ApiBearerAuth()
  // @Header('Content-Type', 'text/event-stream')
  // @Header('Cache-Control', 'no-cache, no-transform')
  // @Header('Connection', 'keep-alive')
  // @Header('X-Accel-Buffering', 'no')
  // @ApiOperation({
  //   summary: 'Analyze selected estate documents and stream results',
  // })
  // @ApiQuery({
  //   name: 'estateId',
  //   type: Number,
  //   description: '부동산 ID',
  //   required: true,
  // })
  // @ApiQuery({
  //   name: 'documentIds',
  //   type: [Number],
  //   description: '분석할 문서 ID 목록 (쉼표로 구분)',
  //   required: false,
  // })
  // analyzeDocumentsStream(
  //   @Query('estateId', ParseIntPipe) estateId: number,
  //   @Query('documentIds', new ParseArrayPipe({ items: Number, optional: true }))
  //   documentIds?: number[],
  // ): Observable<MessageEvent> {
  //   return this.documentService.analyzeEstateDocuments(estateId, documentIds);
  // }
}
