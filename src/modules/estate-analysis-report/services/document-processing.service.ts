import { Injectable } from '@nestjs/common';
import { Document } from '@/modules/document/entities/document.entity';
import { OcrPort } from '@/common/ports/ocr.port';
import { S3Port } from '@/common/ports/s3.port';
import { isEmpty } from '@/common/utils/string.util';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class DocumentProcessingService {
  constructor(
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    private readonly ocrPort: OcrPort,
    private readonly s3Port: S3Port,
  ) {}

  /**
   * S3에서 문서 데이터 준비
   */
  async prepareDocumentData(
    documents: Document[],
  ): Promise<Array<{ base64: string; buffer: Buffer; mimeType: string; name: string }>> {
    return Promise.all(
      documents.map(async (doc) => {
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
  async extractTextWithOcr(
    documentData: Array<{ base64: string; mimeType: string; name: string }>,
  ): Promise<string> {
    const base64Images = documentData.map((data) => ({
      base64: data.base64,
      mimeType: data.mimeType,
      name: data.name,
    }));

    const ocrText = await this.ocrPort.extractTextFromBase64Images(base64Images);
    console.log('OCR Text extracted:', ocrText.substring(0, 200) + '...');

    return ocrText;
  }

  /**
   * OCR 수행 및 extractedText 저장
   * 이미 extractedText가 있는 문서는 OCR을 건너뛰고, 없는 문서만 OCR을 수행합니다.
   * @param documents 문서 배열
   * @returns OCR 텍스트와 모든 문서 데이터
   */
  async processOcrAndExtractText(
    documents: Document[],
  ): Promise<{
    ocrText: string;
    documentData: Array<{ base64: string; buffer: Buffer; mimeType: string; name: string }>;
  }> {
    // 문서를 extractedText 유무에 따라 분류
    const { withText, withoutText } = this.separateDocumentsByExtractedText(documents);

    // 기존 extractedText가 있는 문서들의 텍스트 수집
    const existingTexts = withText
      .map((doc) => doc.extractedText)
      .filter((text): text is string => !isEmpty(text));

    // extractedText가 없는 문서들에 대해서만 OCR 수행
    let newOcrText = '';
    if (withoutText.length > 0) {
      newOcrText = await this.performOcrForDocuments(withoutText);
    }

    // 모든 텍스트를 합침
    const ocrText = this.combineOcrTexts([...existingTexts, newOcrText].filter(Boolean));

    // AI 분석을 위한 모든 문서 데이터 준비
    const documentData = await this.prepareDocumentData(documents);

    return { ocrText, documentData };
  }

  /**
   * 문서를 extractedText 유무에 따라 분류
   */
  private separateDocumentsByExtractedText(documents: Document[]): {
    withText: Document[];
    withoutText: Document[];
  } {
    const withText: Document[] = [];
    const withoutText: Document[] = [];

    for (const doc of documents) {
      if (!isEmpty(doc.extractedText)) {
        withText.push(doc);
      } else {
        withoutText.push(doc);
      }
    }

    return { withText, withoutText };
  }

  /**
   * 문서들에 대해 OCR을 수행하고 결과를 저장
   */
  private async performOcrForDocuments(documents: Document[]): Promise<string> {
    const documentDataForOcr = await this.prepareDocumentData(documents);
    const ocrText = await this.extractTextWithOcr(documentDataForOcr);

    // OCR 결과를 문서들에 저장
    documents.forEach((doc) => {
      doc.extractedText = ocrText;
    });
    await this.documentRepository.save(documents);

    return ocrText;
  }

  /**
   * 여러 OCR 텍스트를 하나로 합침
   */
  private combineOcrTexts(texts: string[]): string {
    return texts.filter(Boolean).join('\n\n');
  }

  /**
   * 분석 프롬프트 생성
   */
  buildAnalysisPrompt(documents: Document[], ocrText: string): string {
    const documentNames = documents.map((d) => d.originalName).join(', ');
    return `다음 문서들을 분석하세요: ${documentNames}\n\nOCR 추출 텍스트:\n${ocrText}`;
  }
}

