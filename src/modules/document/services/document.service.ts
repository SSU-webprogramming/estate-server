import { Injectable, MessageEvent } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Document, DocumentType } from '../entities/document.entity';
import { Estate } from '../../estate/entities/estate.entity';
import { S3Port } from '../../../common/ports/s3.port';
import { OcrPort } from '../../../common/ports/ocr.port';
import { v4 as uuidV4 } from 'uuid';
import { Observable, Subject } from 'rxjs';
import {
  FileWithMimeType,
  TextGeneratorPort,
} from '../../document-analyzer/ports/text-generator.port';
import { SYSTEM_PROMPT } from '../../document-analyzer/prompts/system.prompt';

interface DocumentData {
  base64: string;
  buffer: Buffer;
  mimeType: string;
  name: string;
}

@Injectable()
export class DocumentService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(Estate)
    private readonly estateRepository: Repository<Estate>,
    private readonly s3Port: S3Port,
    private readonly textGeneratorPort: TextGeneratorPort,
    private readonly ocrPort: OcrPort,
  ) {}

  /**
   * 파일 업로드
   * @param estateId 부동산 ID
   * @param file 업로드할 파일
   * @param docType 문서 타입
   */
  async uploadAndCreateDocument(
    estateId: number,
    file: Express.Multer.File,
    docType: DocumentType = DocumentType.REGISTRY,
  ): Promise<Document> {
    const estate = await this.estateRepository.findOne({
      where: { estateId },
    });

    if (!estate) {
      throw new Error(`Estate with id ${estateId} not found`);
    }

    // S3 키 생성을 위한 UUID 생성
    const fileUuid = uuidV4();
    const key = `${estateId}/${fileUuid}-${file.originalname}`;

    // S3에 파일 업로드
    await this.s3Port.upload(file.buffer, key, file.mimetype);

    // 문서 엔티티 생성 및 저장
    const newDocument = this.documentRepository.create({
      estateId,
      estate,
      docType,
      originalName: file.originalname,
      s3Key: key,
      contentType: file.mimetype,
    });

    const savedDocument = await this.documentRepository.save(newDocument);

    return savedDocument;
  }

  /**
   * 올린 파일들을 분석하는 메서드
   * @param estateId 부동산 ID
   * @param documentIds 파일 아이디 목록
   */
  analyzeEstateDocuments(
    estateId: number,
    documentIds?: number[],
  ): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();

    this.processDocumentAnalysis(estateId, documentIds, subject).catch((error) => {
      console.error('Unexpected error in document analysis:', error);
      subject.error(error);
    });

    return subject.asObservable();
  }

  /**
   * 문서 분석 프로세스 실행
   */
  private async processDocumentAnalysis(
    estateId: number,
    documentIds: number[] | undefined,
    subject: Subject<MessageEvent>,
  ): Promise<void> {
    try {
      const documents = await this.findDocumentsToAnalyze(estateId, documentIds);

      if (documents.length === 0) {
        console.log('No documents to analyze.');
        subject.complete();
        return;
      }

      console.log(`Found ${documents.length} documents to analyze.`);
      const docIds = documents.map((doc) => doc.docId);

      this.emitStatusEvent(subject, docIds, 'start');

      const documentData = await this.prepareDocumentData(documents);
      const ocrText = await this.extractTextWithOcr(documentData);
      const analysisResult = await this.analyzeWithAI(
        documents,
        documentData,
        ocrText,
        subject,
        docIds,
      );

      await this.saveAnalysisResult(documents, analysisResult);
      this.emitStatusEvent(subject, docIds, 'completed');

      console.log(`Documents ${docIds.join(', ')} analyzed successfully.`);
    } catch (error) {
      await this.handleAnalysisError(error, documentIds, subject);
    } finally {
      subject.complete();
    }
  }

  /**
   * 분석할 문서 조회
   */
  private async findDocumentsToAnalyze(
    estateId: number,
    documentIds?: number[],
  ): Promise<Document[]> {
    const whereCondition: any = {
      estateId,
    };

    if (documentIds && documentIds.length > 0) {
      whereCondition.docId = In(documentIds);
    }

    return this.documentRepository.find({ where: whereCondition });
  }

  /**
   * S3에서 문서 데이터 준비 (Base64 및 Buffer)
   */
  private async prepareDocumentData(
    documents: Document[],
  ): Promise<DocumentData[]> {
    return Promise.all(
      documents.map(async (doc): Promise<DocumentData> => {
        const base64 = await this.s3Port.downloadAsBase64(doc.s3Key);
        const buffer = await this.s3Port.download(doc.s3Key);

        const fileName = doc.originalName || 'unknown';
        const nameWithoutExt =
          fileName.substring(0, fileName.lastIndexOf('.')) || fileName;

        return {
          base64,
          buffer,
          mimeType: doc.contentType || 'application/octet-stream',
          name: nameWithoutExt,
        };
      }),
    );
  }

  /**
   * OCR로 텍스트 추출
   */
  private async extractTextWithOcr(
    documentData: DocumentData[],
  ): Promise<string> {
    const base64Images = documentData.map((data) => ({
      base64: data.base64,
      mimeType: data.mimeType,
      name: data.name,
    }));

    // todo: 등기부등본 파일만 분석하도록 작업필요
    const ocrText = await this.ocrPort.extractTextFromBase64Images(
      base64Images,
    );
    console.log('OCR Text extracted:', ocrText.substring(0, 200) + '...');

    return ocrText;
  }

  /**
   * AI로 문서 분석 (스트리밍)
   */
  private async analyzeWithAI(
    documents: Document[],
    documentData: DocumentData[],
    ocrText: string,
    subject: Subject<MessageEvent>,
    docIds: number[],
  ): Promise<string> {
    const fileBuffers: FileWithMimeType[] = documentData.map((data) => ({
      buffer: data.buffer,
      mimeType: data.mimeType,
    }));

    const userPrompt = this.buildAnalysisPrompt(documents, ocrText);
    const analysisStream = this.textGeneratorPort.generateTextFromImagesStream(
      SYSTEM_PROMPT,
      userPrompt,
      fileBuffers,
    );

    return this.streamAnalysisResult(analysisStream, subject, docIds);
  }

  /**
   * 분석 프롬프트 생성
   */
  private buildAnalysisPrompt(documents: Document[], ocrText: string): string {
    const documentNames = documents.map((d) => d.originalName).join(', ');
    return `다음 문서들을 분석하세요: ${documentNames}\n\nOCR 추출 텍스트:\n${ocrText}`;
  }

  /**
   * AI 분석 결과 스트리밍 처리
   */
  private async streamAnalysisResult(
    analysisStream: Observable<string>,
    subject: Subject<MessageEvent>,
    docIds: number[],
  ): Promise<string> {
    let fullAnalysisResult = '';

    await new Promise<void>((resolve, reject) => {
      analysisStream.subscribe({
        next: (chunk: string) => {
          fullAnalysisResult += chunk;
          this.emitAnalyzingEvent(subject, docIds, chunk);
        },
        error: (err: Error) => reject(err),
        complete: () => resolve(),
      });
    });

    return fullAnalysisResult;
  }

  /**
   * 분석 결과 저장
   */
  private async saveAnalysisResult(
    documents: Document[],
    analysisResult: string,
  ): Promise<void> {
    // OCR 추출 텍스트를 문서에 저장
    for (const doc of documents) {
      doc.extractedText = analysisResult;
      await this.documentRepository.save(doc);
    }
  }

  /**
   * 분석 에러 처리
   */
  private async handleAnalysisError(
    error: any,
    documentIds: number[] | undefined,
    subject: Subject<MessageEvent>,
  ): Promise<void> {
    console.error('Failed to analyze documents:', error);

    if (documentIds && documentIds.length > 0) {
      this.emitErrorEvent(subject, documentIds, error.message);
    }
  }

  /**
   * SSE 이벤트 전송: 상태 변경
   */
  private emitStatusEvent(
    subject: Subject<MessageEvent>,
    documentIds: number[],
    status: string,
  ): void {
    subject.next({
      data: JSON.stringify({
        documentIds,
        status,
      }),
    } as MessageEvent);
  }

  /**
   * SSE 이벤트 전송: 분석 중
   */
  private emitAnalyzingEvent(
    subject: Subject<MessageEvent>,
    documentIds: number[],
    chunk: string,
  ): void {
    subject.next({
      data: JSON.stringify({
        documentIds,
        status: 'analyzing',
        chunk,
      }),
    } as MessageEvent);
  }

  /**
   * SSE 이벤트 전송: 에러
   */
  private emitErrorEvent(
    subject: Subject<MessageEvent>,
    documentIds: number[],
    errorMessage: string,
  ): void {
    subject.next({
      data: JSON.stringify({
        documentIds,
        status: 'failed',
        error: errorMessage,
      }),
    } as MessageEvent);
  }
}
