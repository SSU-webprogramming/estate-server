import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class DocumentAnalyzerService {
  private readonly geminiApi: GoogleGenerativeAI;

  constructor() {
    this.geminiApi = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  }

    async analyzeDocument(fileBuffer: Buffer, mimeType: string): Promise<string> {
    try {
      const model = this.geminiApi.getGenerativeModel({ model: 'gemini-2.5-flash' });

      // 이미지 부분
      const imagePart = {
        inlineData: {
          data: fileBuffer.toString('base64'),
          mimeType: mimeType,
        },
      };

      // 시스템 프롬프트 (역할, 분석 기준 정의)
      const systemPrompt = `
당신은 부동산 전문 문서 분석가입니다.
PDF, 이미지에 포함된 부동산 관련 문서를 분석하여 
계약 안전성, 소유권, 권리관계, 위험 요소를 평가하세요.
응답 시에는 전문 용어가 나오더라도 일반 사용자가 이해할 수 있도록 풀어서 설명하세요.

문서 유형에 따라 다음 규칙에 따라 분석하세요:
1. 등기부등본(갑구/을구 구분)
2. 건축물대장 또는 토지대장
3. 전세계약서

[분석 체크리스트]
- 등기부등본:
  - [갑구] 소유권 변동(가등기, 압류, 가압류, 가처분 등) 여부 및 위험도 평가
  - [을구] 근저당권 설정 금액, 전세 보증금 대비 비율 산출 및 위험 점수
- 건축물대장/토지대장:
  - 건물/토지 정보와 계약서 정보 일치 여부 확인
- 전세계약서:
  - 임대인과 소유주 일치 여부 확인
  - 특약사항 중 임차인에게 불리한 조건 검토

[출력 포맷]
- 문서가 부동산 관련 문서일 경우:
  [문서 요약]
  - 문서 종류
  - 핵심 내용 요약 (3줄 이내, 일반인이 이해할 수 있는 쉬운 말로 설명)

  [위험 요소 분석]
  - 항목별 점검 결과 (전문 용어 사용 시 괄호나 예시로 쉽게 풀이)

  [권장 조치]
  - 임차인 또는 투자자가 주의해야 할 사항

- 문서가 부동산과 무관한 경우:
  - 분석하지 말고, 반드시 다음 안내만 출력:
    "이 서비스는 부동산 관련 문서(등기부등본, 건축물대장, 토지대장, 전세계약서 등)만 분석할 수 있습니다. 올바른 파일을 업로드해주세요."
`;

      // 유저 프롬프트 (실제 요청)
      const userPrompt = `다음 문서를 분석하세요.`;

      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              { text: systemPrompt }, // 시스템 지침
              { text: userPrompt },   // 사용자 요청
              imagePart,              // 이미지
            ],
          },
        ],
      });

      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini API로 문서 분석 중 오류 발생:', error);
      if (error.message.includes('API key not valid')) {
        throw new BadRequestException('잘못된 Gemini API 키입니다. .env 파일을 확인하세요.');
      }
      throw new InternalServerErrorException('Gemini API로 문서를 분석하지 못했습니다. 서버 로그에서 자세한 내용을 확인하세요.');
    }
  }
}