import { Injectable, MessageEvent } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Document, DocumentStatus } from '../entities/document.entity';
import { User } from '../../user/entities/user.entity';
import { S3Port } from '../../../common/ports/s3.port';
import { v4 as uuidv4 } from 'uuid';
import { Observable, Subject } from 'rxjs';
import { TextGeneratorPort } from '../../document-analyzer/ports/text-generator.port';
import { SYSTEM_PROMPT } from '../../document-analyzer/prompts/system.prompt';

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly s3Port: S3Port,
    private readonly textGeneratorPort: TextGeneratorPort,
  ) {}

  async uploadAndCreateDocument(
    user: User,
    file: Express.Multer.File,
  ): Promise<Document> {
    const key = `${user.id}/${uuidv4()}-${file.originalname}`;

    await this.s3Port.upload(file.buffer, key, file.mimetype);

    const newDocument = this.documentRepository.create({
      user,
      originalName: file.originalname,
      mimeType: file.mimetype,
      s3Path: key,
      status: DocumentStatus.UPLOADED,
    });

    return this.documentRepository.save(newDocument);
  }

  analyzeUserDocuments(user: User, documentIds?: Number[]): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();

    const process = async () => {
      console.log('Analyzing user documents...');
      const whereCondition: any = { user: { id: user.id }, status: DocumentStatus.UPLOADED };

      if (documentIds && documentIds.length > 0) {
        whereCondition.id = In(documentIds);
      }

      const documents = await this.documentRepository.find({
        where: whereCondition,
      });

      console.log(`Found ${documents.length} documents to analyze.`);
      for (const doc of documents) {
        try {
          console.log(`Analyzing document ${doc.id}...`);
          await this.documentRepository.update(doc.id, {
            status: DocumentStatus.ANALYZING,
          });
          subject.next({
            data: JSON.stringify({
              documentId: doc.id,
              status: 'start'
            }),
          } as MessageEvent);

          const fileBuffer = await this.s3Port.download(doc.s3Path);

          const analysisStream = this.textGeneratorPort.generateTextFromImageStream(
            SYSTEM_PROMPT,
            `다음 문서를 분석하세요: ${doc.originalName}`,
            fileBuffer,
            doc.mimeType,
          );

          let fullAnalysisResult = '';
          await new Promise<void>((resolve, reject) => {
            analysisStream.subscribe({
              next: (chunk: string) => {
                console.log(`Received chunk: ${chunk}`);
                fullAnalysisResult += chunk;
                subject.next({
                  data: JSON.stringify({
                    documentId: doc.id,
                    status: 'analyzing',
                    chunk: chunk,
                  }),
                } as MessageEvent);
              },
              error: (err: Error) => {
                reject(err);
              },
              complete: () => {
                resolve();
              },
            });
          });

          await this.documentRepository.update(doc.id, {
            status: DocumentStatus.COMPLETED,
            analysisResult: fullAnalysisResult,
          });

          console.log(`Document ${doc.id} analyzed successfully.`);
          console.log(`Full analysis result: ${fullAnalysisResult}`);

          subject.next({
            data: JSON.stringify({
              documentId: doc.id,
              status: 'completed'
            }),
          } as MessageEvent);
        } catch (error) {
          console.error(`Failed to analyze document ${doc.id}:`, error);
          await this.documentRepository.update(doc.id, {
            status: DocumentStatus.FAILED,
          });
          subject.next({
            data: JSON.stringify({
              documentId: doc.id,
              status: 'failed',
              error: error.message,
            }),
          } as MessageEvent);
        }
      }
      subject.complete();
    };

    process();

    return subject.asObservable();
  }
}
