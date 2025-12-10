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
  Get,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentService } from '@/modules/document/services/document.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { UploadDocumentDto } from '@/modules/document/dto/request/document-request.dto';
import { DocumentResponseDto } from '@/modules/document/dto/response/document-response.dto';
import { DocumentInfoResponseDto } from '@/modules/document/dto/response/document-info-response.dto';
import {
  ApiDocumentController,
  ApiUploadDocument,
  ApiGetDocument,
  ApiGetDocuments,
} from '../swagger/document.api';
import { GetUser } from '@/modules/auth/decorators/get-user.decorator';
import { User } from '@/modules/user/entities/user.entity';

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
    @GetUser() user: User,
  ): Promise<DocumentResponseDto> {
    const document = await this.documentService.uploadAndCreateDocument(
      file,
      uploadDocumentDto.documentType,
      user.userId,
    );
    return document;
  }

  @Get('documents')
  @UseGuards(JwtAuthGuard)
  @ApiGetDocuments()
  async getUserDocuments(
    @GetUser() user: User,
  ): Promise<DocumentInfoResponseDto[]> {
    return this.documentService.getUserDocuments(user.userId);
  }

  @Get('documents/:documentId')
  @UseGuards(JwtAuthGuard)
  @ApiGetDocument()
  async getDocument(
    @Param('documentId', ParseIntPipe) documentId: number,
  ): Promise<DocumentInfoResponseDto> {
    const response = await this.documentService.getDocument(documentId);
    return response;
  }
}
