import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  Part,
  SchemaType,
} from '@google/generative-ai';
import { CustomException } from 'src/common/errors/custom-exception';
import { ErrorCode } from 'src/common/errors/error';
import {
  FileWithMimeType,
  TextGeneratorPort,
} from 'src/modules/estate-analysis-report/ports/text-generator.port';
import { Observable } from 'rxjs';

@Injectable()
export class GeminiService implements TextGeneratorPort {
  private readonly geminiApi: GoogleGenerativeAI;
  private readonly geminiModelName: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new CustomException(ErrorCode.GEMINI_API_KEY_INVALID);
    }
    this.geminiApi = new GoogleGenerativeAI(apiKey);

    const modelName = this.configService.get<string>('GEMINI_MODEL_NAME');
    if (!modelName) {
      throw new CustomException(ErrorCode.GEMINI_MODEL_NAME_INVALID);
    }
    this.geminiModelName = modelName;
  }

  
  async generateTextFromImage(
    systemPrompt: string,
    userPrompt: string,
    fileBuffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    try {
      const model = this.geminiApi.getGenerativeModel({
        model: this.geminiModelName,
      });

      const imagePart = {
        inlineData: {
          data: fileBuffer.toString('base64'),
          mimeType: mimeType,
        },
      };

      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: systemPrompt }, { text: userPrompt }, imagePart],
          },
        ],
      });

      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini로 문서 분석 중 오류 발생:', error);
      if (error.message.includes('API key not valid')) {
        throw new CustomException(ErrorCode.GEMINI_API_KEY_INVALID);
      }
      throw new CustomException(ErrorCode.GEMINI_API_REQUEST_FAILED);
    }
  }

  async generateTextFromImages(
    systemPrompt: string,
    userPrompt: string,
    files: FileWithMimeType[],
  ): Promise<string> {
    try {
      const model = this.geminiApi.getGenerativeModel({
        model: this.geminiModelName,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              safetyScore: {
                type: SchemaType.NUMBER,
                description: '안전 점수 (0~100 사이의 정수, 100점 만점)',
              },
              address: {
                type: SchemaType.STRING,
                description: '주소',
              },
              buildingStructure: {
                type: SchemaType.STRING,
                description: '건물 구조',
                nullable: true,
              },
              buildingUsage: {
                type: SchemaType.STRING,
                description: '건물 용도',
                nullable: true,
              },
              totalFloors: {
                type: SchemaType.STRING,
                description: '총 층수',
                nullable: true,
              },
              totalLandArea: {
                type: SchemaType.NUMBER,
                description: '총 토지 면적 (㎡)',
                nullable: true,
              },
              exclusiveArea: {
                type: SchemaType.NUMBER,
                description: '전용 면적 (㎡)',
                nullable: true,
              },
              landRightRatio: {
                type: SchemaType.STRING,
                description: '지분 비율',
                nullable: true,
              },
              hasSeparateRegistration: {
                type: SchemaType.BOOLEAN,
                description: '분리 등기 여부',
                nullable: true,
              },
              isIllegalConstruction: {
                type: SchemaType.BOOLEAN,
                description: '불법 건축물 여부',
                nullable: true,
              },
              ownershipStatus: {
                type: SchemaType.STRING,
                description: '소유권 상태',
              },
              currentOwner: {
                type: SchemaType.STRING,
                description: '현재 소유자',
                nullable: true,
              },
              transferDate: {
                type: SchemaType.STRING,
                description: '양도일 (YYYY-MM-DD 형식)',
                nullable: true,
              },
              transferCause: {
                type: SchemaType.STRING,
                description: '양도 사유',
                nullable: true,
              },
              pastOwnerChangeCount: {
                type: SchemaType.NUMBER,
                description: '과거 소유자 변경 횟수',
                nullable: true,
              },
              hasOwnershipRestriction: {
                type: SchemaType.BOOLEAN,
                description: '소유권 제한 여부',
                nullable: true,
              },
              rightsAnalysisSummary: {
                type: SchemaType.STRING,
                description: '권리 분석 요약',
                nullable: true,
              },
              recommendedContractClauses: {
                type: SchemaType.ARRAY,
                description: '권장 계약 조항',
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    항목: {
                      type: SchemaType.STRING,
                    },
                    내용: {
                      type: SchemaType.STRING,
                    },
                  },
                  required: ['항목', '내용'],
                },
                nullable: true,
              },
              isInsuranceEligible: {
                type: SchemaType.BOOLEAN,
                description: '보험 가입 가능 여부',
                nullable: true,
              },
              insuranceAnalysisReasons: {
                type: SchemaType.ARRAY,
                description: '보험 분석 사유',
                items: {
                  type: SchemaType.STRING,
                },
                nullable: true,
              },
              recommendedInsuranceCompanies: {
                type: SchemaType.ARRAY,
                description: '권장 보험사',
                items: {
                  type: SchemaType.STRING,
                },
                nullable: true,
              },
            },
            required: ['safetyScore', 'address', 'ownershipStatus'],
          },
        },
      });

      const imageParts: Part[] = files.map((file) => ({
        inlineData: {
          data: file.buffer.toString('base64'),
          mimeType: file.mimeType,
        },
      }));

      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              { text: systemPrompt },
              { text: userPrompt },
              ...imageParts,
            ],
          },
        ],
      });

      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Gemini로 문서 분석 중 오류 발생:', error);
      if (error.message.includes('API key not valid')) {
        throw new CustomException(ErrorCode.GEMINI_API_KEY_INVALID);
      }
      throw new CustomException(ErrorCode.GEMINI_API_REQUEST_FAILED);
    }
  }

  generateTextFromImageStream(
    systemPrompt: string,
    userPrompt: string,
    fileBuffer: Buffer,
    mimeType: string,
  ): Observable<string> {
    return this.generateTextFromImagesStream(systemPrompt, userPrompt, [
      { buffer: fileBuffer, mimeType },
    ]);
  }

  generateTextFromImagesStream(
    systemPrompt: string,
    userPrompt: string,
    files: FileWithMimeType[],
  ): Observable<string> {
    return new Observable((subscriber) => {
      const model = this.geminiApi.getGenerativeModel({
        model: this.geminiModelName,
      });

      const imageParts: Part[] = files.map((file) => ({
        inlineData: {
          data: file.buffer.toString('base64'),
          mimeType: file.mimeType,
        },
      }));

      const streamResult = async () => {
        try {
          const result = await model.generateContentStream({
            contents: [
              {
                role: 'user',
                parts: [
                  { text: systemPrompt },
                  { text: userPrompt },
                  ...imageParts,
                ],
              },
            ],
          });

          for await (const chunk of result.stream) {
            subscriber.next(chunk.text());
          }
          subscriber.complete();
        } catch (error) {
          console.error('Gemini 스트리밍 중 오류 발생:', error);
          if (error.message.includes('API key not valid')) {
            subscriber.error(
              new CustomException(ErrorCode.GEMINI_API_KEY_INVALID),
            );
          } else {
            subscriber.error(
              new CustomException(ErrorCode.GEMINI_API_REQUEST_FAILED),
            );
          }
        }
      };

      streamResult();
    });
  }
}
