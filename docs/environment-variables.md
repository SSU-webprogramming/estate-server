# 환경 변수 설정 가이드

## 개요

Estate Server는 애플리케이션 시작 시 모든 필수 환경변수를 자동으로 검증합니다. 누락되거나 잘못된 환경변수가 있을 경우 명확한 에러 메시지와 함께 애플리케이션이 시작되지 않습니다.

## 환경변수 검증 시스템

### 검증 시점
- 애플리케이션 부팅 시 (NestJS ConfigModule 초기화 단계)
- 모든 모듈이 로드되기 전에 실행
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
DB_HOST=localhost              # PostgreSQL 호스트 주소
DB_PORT=54322                  # PostgreSQL 포트 (1-65535)
DB_USERNAME=postgres           # PostgreSQL 사용자명
DB_PASSWORD=postgres           # PostgreSQL 비밀번호
DB_DATABASE=webprogramming     # 데이터베이스 이름
```

**설명**:
- `DB_PORT`는 유효한 포트 범위 (1-65535) 내의 숫자여야 합니다
- 운영 환경에서는 강력한 비밀번호 사용 필수

### Kakao OAuth 인증

```env
KAKAO_CLIENT_ID=YOUR_KAKAO_CLIENT_ID
KAKAO_CLIENT_SECRET=YOUR_KAKAO_CLIENT_SECRET
```

**설명**:
- [Kakao Developers](https://developers.kakao.com/)에서 애플리케이션 등록 후 발급
- Redirect URI 등록 필요: `http://localhost:3000/auth/kakao/callback`

### JWT 토큰

```env
# JWT Secret Keys (최소 32자 이상의 안전한 랜덤 문자열)
JWT_SECRET=your_jwt_secret_minimum_32_characters_required
JWT_REGISTER_SECRET=your_jwt_register_secret_minimum_32_characters
JWT_REFRESH_SECRET=your_jwt_refresh_secret_minimum_32_characters
```

**보안 권장사항**:
- 각 시크릿은 서로 다른 값 사용
- 최소 32자 이상의 랜덤 문자열
- 영문 대소문자, 숫자, 특수문자 조합
- 운영 환경에서는 시크릿 관리 서비스 사용 권장 (AWS Secrets Manager, HashiCorp Vault 등)

**생성 방법**:
```bash
# Node.js 사용
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OpenSSL 사용
openssl rand -hex 32
```

### AI Provider 설정

```env
AI_PROVIDER=gemini  # 'gemini' 또는 'chatgpt' 중 하나 선택

# AI_PROVIDER=gemini인 경우 필수
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL_NAME=gemini-1.5-flash

# AI_PROVIDER=chatgpt인 경우 필수
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
GPT_MODEL_NAME=gpt-4
```

**설명**:
- `AI_PROVIDER`는 반드시 `gemini` 또는 `chatgpt` 중 하나여야 합니다
- 선택한 Provider에 따라 해당 API 키가 필수로 요구됩니다
- Gemini API 키: [Google AI Studio](https://makersuite.google.com/app/apikey)
- OpenAI API 키: [OpenAI Platform](https://platform.openai.com/api-keys)

### AWS S3 / MinIO 설정

```env
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_S3_ENDPOINT=http://localhost:9000  # 유효한 URL 형식 필요
AWS_S3_BUCKET_NAME=documents
AWS_REGION=us-east-1
```

**설명**:
- 로컬 개발: Docker Compose로 실행되는 MinIO 사용
- 운영 환경: AWS S3 또는 호환 스토리지 사용
- `AWS_S3_ENDPOINT`는 유효한 URL 형식이어야 합니다

### 암호화 설정

```env
# 민감정보 암호화 키 (최소 32자 이상)
ENCRYPTION_KEY=your_encryption_key_minimum_32_characters_required

# 암호화 활성화 여부 (기본값: true)
ENCRYPTION_ENABLED=true
```

**설명**:
- 사용자 이메일, 주소, 소유자명 등 민감정보 암호화에 사용
- AES-256-GCM 알고리즘 사용
- **?? 중요**: 한 번 설정한 키는 절대 변경하지 말 것 (기존 데이터 복호화 불가)

**생성 방법**:
```bash
# OpenSSL 사용
openssl rand -base64 32

# Node.js 사용
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
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

**설명**:
- Access Token: API 요청 시 사용, 짧게 설정 (1시간 권장)
- Refresh Token: Access Token 갱신 시 사용, 길게 설정 (7일 권장)
- TTL: Redis에 Refresh Token 저장 시 만료 시간 (초 단위)

### Redis 설정

```env
REDIS_HOST=localhost  # 기본값: localhost
REDIS_PORT=6379       # 기본값: 6379
```

**설명**:
- 캐싱 및 Refresh Token 저장에 사용
- 로컬 개발: Docker Compose로 실행

### 프론트엔드 설정

```env
FRONTEND_URL=http://localhost:3001  # 프론트엔드 URL
```

**설명**:
- CORS 설정 및 리다이렉션에 사용
- 운영 환경에서는 실제 프론트엔드 도메인으로 설정

### HTTP 클라이언트 설정

```env
HTTP_TIMEOUT=5000  # HTTP 요청 타임아웃 (밀리초, 기본값: 5000)
```

**설명**:
- 외부 API 호출 시 타임아웃 시간
- AI API, OCR API 등에 적용

### Clova OCR (선택사항)

```env
CLOVA_API_KEY=YOUR_CLOVA_API_KEY
CLOVA_API_GATEWAY=YOUR_CLOVA_API_GATEWAY
```

**설명**:
- 문서 OCR 처리에 사용 (선택사항)
- [Naver Cloud Platform](https://www.ncloud.com/)에서 발급

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
[AWS_S3_ENDPOINT] AWS_S3_ENDPOINT must be a valid URL
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

## 환경 변수 파일 예시

### 개발 환경 (`.env`)

```env
# --- Database
DB_HOST=localhost
DB_PORT=54322
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=webprogramming

# --- Kakao OAuth
KAKAO_CLIENT_ID=YOUR_KAKAO_CLIENT_ID
KAKAO_CLIENT_SECRET=YOUR_KAKAO_CLIENT_SECRET

# --- JWT (최소 32자 이상)
JWT_SECRET=your_jwt_secret_minimum_32_characters_required
JWT_REGISTER_SECRET=your_jwt_register_secret_minimum_32_characters
JWT_REFRESH_SECRET=your_jwt_refresh_secret_minimum_32_characters
JWT_ACCESS_TOKEN_EXPIRATION_TIME=1h
JWT_REFRESH_TOKEN_EXPIRATION_TIME=7d
JWT_REFRESH_TOKEN_EXPIRATION_TIME_TTL=604800

# --- AI Provider
AI_PROVIDER=gemini
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL_NAME=gemini-1.5-flash
# OPENAI_API_KEY=YOUR_OPENAI_API_KEY
# GPT_MODEL_NAME=gpt-4

# --- AWS S3 (MinIO)
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_S3_ENDPOINT=http://localhost:9000
AWS_S3_BUCKET_NAME=documents
AWS_REGION=us-east-1

# --- Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# --- Frontend
FRONTEND_URL=http://localhost:3001

# --- Encryption (최소 32자 이상)
ENCRYPTION_KEY=your_encryption_key_minimum_32_characters_required
ENCRYPTION_ENABLED=true

# --- Clova OCR (선택)
# CLOVA_API_KEY=YOUR_CLOVA_API_KEY
# CLOVA_API_GATEWAY=YOUR_CLOVA_API_GATEWAY

# --- HTTP
HTTP_TIMEOUT=5000

# --- Node
NODE_ENV=development
```

### 운영 환경

운영 환경에서는 `.env` 파일 대신 다음 방법을 사용하는 것을 권장합니다:

#### Docker 환경변수

```yaml
# docker-compose.yml
services:
  api:
    image: estate-server:latest
    environment:
      - DB_HOST=${DB_HOST}
      - DB_PORT=${DB_PORT}
      - JWT_SECRET=${JWT_SECRET}
      # ...
```

#### Kubernetes Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: estate-server-secrets
type: Opaque
stringData:
  DB_PASSWORD: ${DB_PASSWORD}
  JWT_SECRET: ${JWT_SECRET}
  ENCRYPTION_KEY: ${ENCRYPTION_KEY}
  # ...
```

#### AWS Systems Manager Parameter Store

```bash
# 파라미터 저장
aws ssm put-parameter \
  --name "/estate-server/prod/JWT_SECRET" \
  --value "your_jwt_secret" \
  --type "SecureString"
```

## 트러블슈팅

### 애플리케이션이 시작되지 않을 때

1. **에러 메시지를 주의 깊게 읽기**
   - 어떤 환경변수가 누락되었는지 정확히 표시됨

2. **누락된 환경변수 확인**
   ```bash
   cat .env | grep VARIABLE_NAME
   ```

3. **`.env` 파일의 오타 확인**
   - 변수명 대소문자 확인
   - `=` 앞뒤 공백 없는지 확인

4. **문자열 값에 따옴표 확인**
   - `.env` 파일에서는 보통 따옴표 불필요
   - 특수문자가 포함된 경우에만 사용

### 환경변수가 제대로 로드되지 않을 때

1. **`.env` 파일 위치 확인**
   ```bash
   ls -la | grep .env
   ```
   - 프로젝트 루트 디렉토리에 위치해야 함

2. **파일명 확인**
   - `.env` (숨김 파일)
   - `.env.example`이나 `env` 아님

3. **애플리케이션 재시작**
   ```bash
   npm run start:dev
   ```

4. **환경변수 값 확인** (디버깅 목적)
   ```typescript
   console.log(process.env.JWT_SECRET);
   ```

### JWT Secret 관련 오류

**문제**: "JWT_SECRET은 최소 32자 이상이어야 합니다"

**해결**:
```bash
# 32자 이상의 랜덤 문자열 생성
openssl rand -hex 32
```

### AI Provider 설정 오류

**문제**: "AI_PROVIDER가 gemini인 경우 GEMINI_API_KEY는 필수입니다"

**해결**:
1. `AI_PROVIDER=gemini`로 설정했는지 확인
2. `GEMINI_API_KEY`가 설정되어 있는지 확인
3. API 키가 유효한지 확인

### 암호화 키 관련 오류

**문제**: "ENCRYPTION_KEY는 최소 32자 이상이어야 합니다"

**해결**:
```bash
# 32바이트 암호화 키 생성
openssl rand -base64 32
```

## 보안 체크리스트

- [ ] `.env` 파일이 `.gitignore`에 포함되어 있는가?
- [ ] 모든 Secret 키가 최소 32자 이상인가?
- [ ] 개발/운영 환경별로 다른 Secret 키를 사용하는가?
- [ ] 운영 환경에서는 시크릿 관리 서비스를 사용하는가?
- [ ] Git 히스토리에 Secret 키가 커밋되지 않았는가?
- [ ] 팀원들이 `.env.example` 파일을 참고하여 설정할 수 있는가?

## 참고 자료

- [NestJS Config 공식 문서](https://docs.nestjs.com/techniques/configuration)
- [class-validator 공식 문서](https://github.com/typestack/class-validator)
- [검증 로직 코드](../src/config/env.validation.ts)
- [데이터 암호화 가이드](./data-encryption-guide.md)

---

**Last Updated**: 2024-12-16  
**Version**: 1.0.0
