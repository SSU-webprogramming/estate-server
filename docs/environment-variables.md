# 환경 변수 설정 가이드

## 개요

이 프로젝트는 애플리케이션 시작 시 모든 필수 환경변수를 자동으로 검증합니다. 누락되거나 잘못된 환경변수가 있을 경우 명확한 에러 메시지와 함께 애플리케이션이 시작되지 않습니다.

## 환경변수 검증 시스템

### 검증 시점
- 애플리케이션 부팅 시 (NestJS ConfigModule 초기화 단계)
- 모든 모듈이 로드되기 전에 실행됨
- 검증 실패 시 즉시 프로세스 종료

### 검증 규칙
- `class-validator`를 사용한 강력한 타입 검증
- 필수 필드 누락 검사
- 데이터 타입 검증 (문자열, 숫자, URL 등)
- 값의 범위 검증 (포트 번호, 문자열 길이 등)
- AI Provider에 따른 조건부 필수 필드 검증

## 필수 환경 변수

### 데이터베이스 설정
```env
DB_HOST=localhost              # 데이터베이스 호스트
DB_PORT=54322                  # 포트 (1-65535)
DB_USERNAME=postgres           # 사용자명
DB_PASSWORD=postgres           # 비밀번호
DB_DATABASE=webprogramming     # 데이터베이스 이름
```

### Kakao OAuth 인증
```env
KAKAO_CLIENT_ID=YOUR_KAKAO_CLIENT_ID
KAKAO_CLIENT_SECRET=YOUR_KAKAO_CLIENT_SECRET
```

### JWT 토큰
```env
# 최소 32자 이상의 안전한 랜덤 문자열 사용
JWT_SECRET=YOUR_JWT_SECRET_MIN_32_CHARACTERS
JWT_REGISTER_SECRET=YOUR_JWT_REGISTER_SECRET_MIN_32_CHARACTERS
JWT_REFRESH_SECRET=YOUR_JWT_REFRESH_SECRET_MIN_32_CHARACTERS
```

**보안 권장사항:**
- 각 시크릿은 서로 다른 값 사용
- 최소 32자 이상의 랜덤 문자열
- 운영 환경에서는 시크릿 관리 서비스 사용 권장 (AWS Secrets Manager, HashiCorp Vault 등)

### AI Provider 설정
```env
AI_PROVIDER=gemini  # 'gemini' 또는 'chatgpt'

# AI_PROVIDER=gemini인 경우 필수
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL_NAME=gemini-1.5-flash

# AI_PROVIDER=chatgpt인 경우 필수
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
GPT_MODEL_NAME=gpt-4
```

### AWS S3 / MinIO 설정
```env
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_S3_ENDPOINT=http://localhost:9000  # 유효한 URL 형식
AWS_S3_BUCKET_NAME=documents
AWS_REGION=us-east-1
```

## 선택적 환경 변수

### 기본 설정
```env
NODE_ENV=development  # development | production | test
```

### JWT 토큰 만료 시간
```env
JWT_ACCESS_TOKEN_EXPIRATION_TIME=1h      # 기본값: 1h
JWT_REFRESH_TOKEN_EXPIRATION_TIME=7d     # 기본값: 7d
JWT_REFRESH_TOKEN_EXPIRATION_TIME_TTL=604800  # 기본값: 604800 (7일, 초 단위)
```

### Redis 설정
```env
REDIS_HOST=localhost  # 기본값: localhost
REDIS_PORT=6379       # 기본값: 6379
```

### 기타
```env
FRONTEND_URL=http://localhost:3001  # 프론트엔드 URL
HTTP_TIMEOUT=5000                   # HTTP 타임아웃 (밀리초, 기본값: 5000)
```

### Clova OCR (선택사항)
```env
CLOVA_API_KEY=
CLOVA_API_GATEWAY=
```

## 에러 메시지 예시

### 필수 필드 누락
```
환경 변수 검증 실패:
[DB_HOST] DB_HOST는 필수 값입니다.
[JWT_SECRET] JWT_SECRET은 최소 32자 이상이어야 합니다.
```

### 데이터 타입 오류
```
환경 변수 검증 실패:
[DB_PORT] DB_PORT must be a number conforming to the specified constraints
```

### Enum 값 오류
```
환경 변수 검증 실패:
[AI_PROVIDER] AI_PROVIDER는 gemini 또는 chatgpt 중 하나여야 합니다.
```

### AI Provider별 조건부 필수 필드 누락
```
환경 변수 검증 실패:
[GEMINI_API_KEY] AI_PROVIDER가 gemini인 경우 GEMINI_API_KEY는 필수입니다.
```

## JWT Secret 생성 방법

### Node.js 사용
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### OpenSSL 사용
```bash
openssl rand -hex 32
```

### 온라인 도구
https://randomkeygen.com/ (개발 환경 전용, 운영 환경에서는 로컬 생성 권장)

## 환경별 설정 관리

### 개발 환경
`.env` 파일 사용 (gitignore에 포함)

### 운영 환경
- Docker: 환경변수로 직접 주입
- Kubernetes: ConfigMap / Secret 사용
- AWS: Parameter Store / Secrets Manager
- 기타: 시크릿 관리 서비스 사용

## 트러블슈팅

### 애플리케이션이 시작되지 않을 때
1. 에러 메시지를 주의 깊게 읽기
2. 누락된 환경변수 확인
3. `.env` 파일의 오타 확인
4. 문자열 값에 따옴표가 불필요한지 확인

### 환경변수가 제대로 로드되지 않을 때
- `.env` 파일 위치 확인 (프로젝트 루트)
- 파일명 확인 (`.env`, 숨김 파일)
- 애플리케이션 재시작

## 참고

검증 로직은 `src/config/env.validation.ts`에 정의되어 있으며, 필요에 따라 커스터마이징할 수 있습니다.

