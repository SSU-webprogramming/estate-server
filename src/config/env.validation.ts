import { plainToInstance } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsUrl,
  validateSync,
  Min,
  Max,
  MinLength,
} from 'class-validator';

/**
 * 환경 변수 Enum 정의
 */
enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

enum AiProvider {
  Gemini = 'gemini',
  ChatGpt = 'chatgpt',
}

/**
 * 환경 변수 검증 클래스
 * 애플리케이션 시작 시 모든 필수 환경변수가 올바르게 설정되었는지 검증합니다.
 */
class EnvironmentVariables {
  // === 기본 설정 ===
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  // === 데이터베이스 설정 ===
  @IsString()
  @MinLength(1, { message: 'DB_HOST는 필수 값입니다.' })
  DB_HOST: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  DB_PORT: number;

  @IsString()
  @MinLength(1, { message: 'DB_USERNAME은 필수 값입니다.' })
  DB_USERNAME: string;

  @IsString()
  @MinLength(1, { message: 'DB_PASSWORD는 필수 값입니다.' })
  DB_PASSWORD: string;

  @IsString()
  @MinLength(1, { message: 'DB_DATABASE는 필수 값입니다.' })
  DB_DATABASE: string;

  // === Kakao OAuth 설정 ===
  @IsString()
  @MinLength(1, { message: 'KAKAO_CLIENT_ID는 필수 값입니다.' })
  KAKAO_CLIENT_ID: string;

  @IsString()
  @MinLength(1, { message: 'KAKAO_CLIENT_SECRET은 필수 값입니다.' })
  KAKAO_CLIENT_SECRET: string;

  // === JWT 설정 ===
  @IsString()
  @MinLength(32, { message: 'JWT_SECRET은 최소 32자 이상이어야 합니다.' })
  JWT_SECRET: string;

  @IsString()
  @MinLength(32, { message: 'JWT_REGISTER_SECRET은 최소 32자 이상이어야 합니다.' })
  JWT_REGISTER_SECRET: string;

  @IsString()
  @MinLength(32, { message: 'JWT_REFRESH_SECRET은 최소 32자 이상이어야 합니다.' })
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_TOKEN_EXPIRATION_TIME: string = '1h';

  @IsString()
  @IsOptional()
  JWT_REFRESH_TOKEN_EXPIRATION_TIME: string = '7d';

  @IsNumber()
  @IsOptional()
  JWT_REFRESH_TOKEN_EXPIRATION_TIME_TTL: number = 604800;

  // === AI Provider 설정 ===
  @IsEnum(AiProvider, {
    message: 'AI_PROVIDER는 gemini 또는 chatgpt 중 하나여야 합니다.',
  })
  AI_PROVIDER: AiProvider;

  @IsString()
  @IsOptional()
  GEMINI_API_KEY?: string;

  @IsString()
  @IsOptional()
  GEMINI_MODEL_NAME?: string;

  @IsString()
  @IsOptional()
  OPENAI_API_KEY?: string;

  @IsString()
  @IsOptional()
  GPT_MODEL_NAME?: string;

  // === AWS S3 설정 ===
  @IsString()
  @MinLength(1, { message: 'AWS_ACCESS_KEY_ID는 필수 값입니다.' })
  AWS_ACCESS_KEY_ID: string;

  @IsString()
  @MinLength(1, { message: 'AWS_SECRET_ACCESS_KEY는 필수 값입니다.' })
  AWS_SECRET_ACCESS_KEY: string;

  @IsUrl({ require_tld: false }, { message: 'AWS_S3_ENDPOINT는 유효한 URL이어야 합니다.' })
  AWS_S3_ENDPOINT: string;

  @IsString()
  @MinLength(1, { message: 'AWS_S3_BUCKET_NAME은 필수 값입니다.' })
  AWS_S3_BUCKET_NAME: string;

  @IsString()
  @MinLength(1, { message: 'AWS_REGION은 필수 값입니다.' })
  AWS_REGION: string;

  // === Redis 설정 ===
  @IsString()
  @IsOptional()
  REDIS_HOST: string = 'localhost';

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(65535)
  REDIS_PORT: number = 6379;

  // === 기타 설정 ===
  @IsString()
  @IsOptional()
  FRONTEND_URL?: string;

  @IsNumber()
  @IsOptional()
  @Min(1000)
  @Max(60000)
  HTTP_TIMEOUT: number = 5000;

  @IsString()
  @IsOptional()
  CLOVA_API_KEY?: string;

  @IsString()
  @IsOptional()
  CLOVA_API_GATEWAY?: string;
}

/**
 * 환경 변수 검증 함수
 * ConfigModule에서 사용됩니다.
 *
 * @param config 환경 변수 객체
 * @returns 검증된 환경 변수 객체
 * @throws Error 검증 실패 시
 */
export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error) => {
        const constraints = error.constraints
          ? Object.values(error.constraints).join(', ')
          : '알 수 없는 에러';
        return `[${error.property}] ${constraints}`;
      })
      .join('\n');

    throw new Error(`환경 변수 검증 실패:\n${errorMessages}`);
  }

  // AI Provider별 필수 키 검증
  if (validatedConfig.AI_PROVIDER === AiProvider.Gemini) {
    if (!validatedConfig.GEMINI_API_KEY) {
      throw new Error(
        '환경 변수 검증 실패:\n[GEMINI_API_KEY] AI_PROVIDER가 gemini인 경우 GEMINI_API_KEY는 필수입니다.',
      );
    }
    if (!validatedConfig.GEMINI_MODEL_NAME) {
      throw new Error(
        '환경 변수 검증 실패:\n[GEMINI_MODEL_NAME] AI_PROVIDER가 gemini인 경우 GEMINI_MODEL_NAME은 필수입니다.',
      );
    }
  }

  if (validatedConfig.AI_PROVIDER === AiProvider.ChatGpt) {
    if (!validatedConfig.OPENAI_API_KEY) {
      throw new Error(
        '환경 변수 검증 실패:\n[OPENAI_API_KEY] AI_PROVIDER가 chatgpt인 경우 OPENAI_API_KEY는 필수입니다.',
      );
    }
    if (!validatedConfig.GPT_MODEL_NAME) {
      throw new Error(
        '환경 변수 검증 실패:\n[GPT_MODEL_NAME] AI_PROVIDER가 chatgpt인 경우 GPT_MODEL_NAME은 필수입니다.',
      );
    }
  }

  return validatedConfig;
}

