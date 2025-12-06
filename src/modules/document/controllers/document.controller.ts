import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  UseGuards,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentService } from '@/modules/document/services/document.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { UploadDocumentDto } from '@/modules/document/dto/request/upload-document.dto';
import { DocumentResponseDto } from '@/modules/document/dto/response/document-response.dto';
import {
  ApiDocumentController,
  ApiUploadDocument,
} from '../swagger/document.api';

@ApiDocumentController()
@Controller()
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post("documents")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file') as any)
  @ApiUploadDocument()
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
    const document = await this.documentService.uploadAndCreateDocument(
      file,
      uploadDocumentDto.documentType,
    );
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
