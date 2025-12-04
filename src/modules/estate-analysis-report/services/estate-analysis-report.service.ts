import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { TextGeneratorPort, FileWithMimeType } from '@/modules/estate-analysis-report/ports/text-generator.port';
import { SYSTEM_PROMPT } from '@/modules/estate-analysis-report/prompts/system.prompt';
import { Estate } from '@/modules/estate/entities/estate.entity';
import { Document } from '@/modules/document/entities/document.entity';
import { EstateAnalysisReport } from '@/modules/estate-analysis-report/entities/estate-analysis-report.entity';
import { OcrPort } from '@/common/ports/ocr.port';
import { S3Port } from '@/common/ports/s3.port';
import { isEmpty } from '@/common/utils/string.util';
import { AnalysisResultStatus } from '@/common/enums/analysis-result-status.enum';
import { CreateEstateAnalysisDto } from '@/modules/estate-analysis-report/dto/req/estate-analysis-req.dto';

@Injectable()
export class EstateAnalysisReportService {
  constructor(
    @InjectRepository(Estate)
    private readonly estateRepository: Repository<Estate>,
    @InjectRepository(Document)
    private readonly documentRepository: Repository<Document>,
    @InjectRepository(EstateAnalysisReport)
    private readonly analysisReportRepository: Repository<EstateAnalysisReport>,
    private readonly textGeneratorPort: TextGeneratorPort,
    private readonly ocrPort: OcrPort,
    private readonly s3Port: S3Port,
  ) {}

  async analyzeEsate(fileBuffer: Buffer, mimeType: string): Promise<string> {
    const userPrompt = `다음 문서를 분석하세요.`;

    return this.textGeneratorPort.generateTextFromImage(
      SYSTEM_PROMPT,
      userPrompt,
      fileBuffer,
      mimeType,
    );
  }

  /**
   * 부동산 정보를 받아서 분석을 요청하는 메서드
   * @param userId 사용자 ID
   * @param createEstateAnalysisDto 부동산 정보 및 문서 ID 목록
   * @returns 생성된 분석 리포트
   */
  async analyzeEstateWithDocuments(
    userId: number,
    createEstateAnalysisDto: CreateEstateAnalysisDto,
  ): Promise<EstateAnalysisReport> {
    // 1. Estate 엔티티 생성 및 저장
    const estate = this.estateRepository.create({
      userId,
      address: createEstateAnalysisDto.address ?? null,
      addressDetail: createEstateAnalysisDto.addressDetail ?? null,
      contractType: createEstateAnalysisDto.contractType ?? null,
      deposit: createEstateAnalysisDto.deposit ?? 0,
      monthlyRent: createEstateAnalysisDto.monthlyRent ?? 0,
      kbMarketPrice: createEstateAnalysisDto.kbMarketPrice ?? 0,
    });
    const savedEstate = await this.estateRepository.save(estate);

    // 2. Document 조회
    const documents = await this.documentRepository.find({
      where: { docId: In(createEstateAnalysisDto.documentIds) },
    });

    if (documents.length === 0) {
      throw new Error('문서를 찾을 수 없습니다.');
    }

    // 3. Document를 Estate에 연결
    for (const document of documents) {
      document.estateId = savedEstate.estateId;
      document.estate = savedEstate;
    }
    await this.documentRepository.save(documents);

    // 4. OCR 수행 및 extractedText 저장
    const { ocrText, documentData } = await this.processOcrAndExtractText(documents);


    // 5. 사용되지 않은 Document 삭제 (임시파일)
    await this.deleteUnusedDocuments(createEstateAnalysisDto.documentIds);
    // 6. AI 분석 요청
    const fileBuffers: FileWithMimeType[] = documentData.map((data) => ({
      buffer: data.buffer,
      mimeType: data.mimeType,
    }));
    const userPrompt = this.buildAnalysisPrompt(documents, ocrText);
    const analysisResult = await this.textGeneratorPort.generateTextFromImages(
      SYSTEM_PROMPT,
      userPrompt,
      fileBuffers
    );

    // 여기까지 됨
    console.log('analysisResult:\n\n', analysisResult);
    
    // 7. AI 분석 결과 파싱
    let parsedAnalysis: any = {};
    try {
      parsedAnalysis = JSON.parse(analysisResult);
    } catch (error) {
      console.error('Failed to parse analysis result as JSON:', error);
      // JSON 파싱 실패 시 기본값 사용
    }

    // 8. EstateAnalysisReport 저장
    const analysisReport = this.analysisReportRepository.create({
      estateId: savedEstate.estateId,
      estate: savedEstate,
      analyzedAt: new Date(),
      safetyScore: parsedAnalysis.safetyScore ?? null,
      address: parsedAnalysis.address || savedEstate.address || '',
      ownershipStatus: parsedAnalysis.ownershipStatus || 'UNKNOWN',
      buildingStructure: parsedAnalysis.buildingStructure || null,
      buildingUsage: parsedAnalysis.buildingUsage || null,
      totalFloors: parsedAnalysis.totalFloors || null,
      totalLandArea: parsedAnalysis.totalLandArea || null,
      exclusiveArea: parsedAnalysis.exclusiveArea || null,
      landRightRatio: parsedAnalysis.landRightRatio || null,
      hasSeparateRegistration: parsedAnalysis.hasSeparateRegistration ?? null,
      isIllegalConstruction: parsedAnalysis.isIllegalConstruction ?? null,
      currentOwner: parsedAnalysis.currentOwner || null,
      transferDate: parsedAnalysis.transferDate 
        ? new Date(parsedAnalysis.transferDate) 
        : null,
      transferCause: parsedAnalysis.transferCause || null,
      pastOwnerChangeCount: parsedAnalysis.pastOwnerChangeCount || null,
      hasOwnershipRestriction: parsedAnalysis.hasOwnershipRestriction ?? null,
      titleSectionAnalysisSummary: parsedAnalysis.titleSectionAnalysisSummary || null,
      titleSectionAnalysisResult: this.parseAnalysisResultStatus(parsedAnalysis.titleSectionAnalysisResult),
      ownershipSectionAnalysisSummary: parsedAnalysis.ownershipSectionAnalysisSummary || null,
      ownershipSectionAnalysisResult: this.parseAnalysisResultStatus(parsedAnalysis.ownershipSectionAnalysisResult),
      rightsSectionAnalysisSummary: parsedAnalysis.rightsSectionAnalysisSummary || null,
      rightsSectionAnalysisResult: this.parseAnalysisResultStatus(parsedAnalysis.rightsSectionAnalysisResult),
      rightsAnalysisSummary: parsedAnalysis.rightsAnalysisSummary || analysisResult,
      recommendedContractClauses: parsedAnalysis.recommendedContractClauses || null,
      isInsuranceEligible: parsedAnalysis.isInsuranceEligible ?? null,
      insuranceAnalysisReasons: parsedAnalysis.insuranceAnalysisReasons || null,
      recommendedInsuranceCompanies: parsedAnalysis.recommendedInsuranceCompanies || null,
    });
    console.log('analysisReport', analysisReport);
    return await this.analysisReportRepository.save(analysisReport);
  }

  /**
   * S3에서 문서 데이터 준비
   */
  private async prepareDocumentData(
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
  private async extractTextWithOcr(
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
  private async processOcrAndExtractText(
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
  private buildAnalysisPrompt(documents: Document[], ocrText: string): string {
    const documentNames = documents.map((d) => d.originalName).join(', ');
    return `다음 문서들을 분석하세요: ${documentNames}\n\nOCR 추출 텍스트:\n${ocrText}`;
  }

  /**
   * 사용되지 않은 Document 삭제 (임시파일)
   */
  private async deleteUnusedDocuments(usedDocumentIds: number[]): Promise<void> {
    // estateId가 null인 모든 문서 조회
    const unlinkedDocuments = await this.documentRepository.find({
      where: { estateId: IsNull() },
    });

    // 사용되지 않은 문서 필터링
    const documentsToDelete = unlinkedDocuments.filter(
      (doc) => !usedDocumentIds.includes(doc.docId),
    );

    // S3에서 파일 삭제
    for (const document of documentsToDelete) {
      try {
        await this.s3Port.delete(document.s3Key);
      } catch (error) {
        console.error(`Failed to delete S3 file ${document.s3Key}:`, error);
      }
    }

    // DB에서 문서 삭제
    if (documentsToDelete.length > 0) {
      const docIdsToDelete = documentsToDelete.map((doc) => doc.docId);
      await this.documentRepository.delete({
        docId: In(docIdsToDelete),
      });
    }
  }

  /**
   * 부동산 ID로 분석 리포트 조회
   * @param estateId 부동산 ID
   * @returns 분석 리포트 또는 null (분석이 완료되지 않은 경우)
   */
  async findByEstateId(
    estateId: number,
  ): Promise<EstateAnalysisReport | null> {
    return await this.analysisReportRepository.findOne({
      where: { estateId },
    });
  }

  /**
   * 분석 결과 상태 문자열을 enum으로 변환
   * @param status 분석 결과 상태 문자열 (SAFE, CAUTION, DANGER, UNKNOWN)
   * @returns AnalysisResultStatus enum 값 또는 null
   */
  private parseAnalysisResultStatus(status: string | undefined): AnalysisResultStatus | null {
    if (!status) {
      return null;
    }
    
    const upperStatus = status.toUpperCase();
    
    // enum 값으로 직접 매칭
    if (upperStatus === 'SAFE') {
      return AnalysisResultStatus.SAFE;
    }
    if (upperStatus === 'CAUTION') {
      return AnalysisResultStatus.CAUTION;
    }
    if (upperStatus === 'DANGER') {
      return AnalysisResultStatus.DANGER;
    }
    if (upperStatus === 'UNKNOWN') {
      return AnalysisResultStatus.UNKNOWN;
    }
    
    return null;
  }
}
