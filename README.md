# NestJS 계층형 아키텍처 프로젝트

NestJS로 만든 샘플 애플리케이션입니다. Controller, Service, Repository 구조로 이루어진 계층형 아키텍처를 구현했으며, TypeORM(PostgreSQL), `class-validator`, `class-transformer` 등을 사용했습니다.

## 목차

- [설치 방법](#설치-방법)
- [환경 설정](#환경-설정)
- [실행 방법](#실행-방법)
- [Swagger API 문서](#swagger-api-문서)
- [프로젝트 구조](#프로젝트-구조)
- [코드 품질](#코드-품질)
- [성능 최적화](#성능-최적화)

## 설치 방법

1.  **저장소 클론**
    ```bash
    git clone <your-repository-url>
    cd <your-project-name>
    ```

2.  **패키지 설치**
    ```bash
    npm install
    ```

## 환경 설정

```
nvm use 22
```

### 환경 변수



프로젝트 루트에 `.env` 파일을 작성 후 실행:

```env
# --- Database
DB_HOST=localhost
DB_PORT=54322
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=webprogramming

# --- Kakao Login
KAKAO_CLIENT_ID=YOUR_KAKAO_CLIENT_ID
KAKAO_CLIENT_SECRET=YOUR_KAKAO_CLIENT_SECRET

# --- JWT
JWT_SECRET=YOUR_JWT_SECRET

# --- AI Provider
# AI_PROVIDER는 'gemini' 또는 'chatgpt' 중 하나를 선택합니다.
AI_PROVIDER=gemini
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL_NAME=YOUR_GEMINI_MODEL_NAME
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
GPT_MODEL_NAME=YOUR_GPT_MODEL_NAME

# --- AWS S3 (MinIO)
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_S3_ENDPOINT=http://localhost:9000
AWS_S3_BUCKET_NAME=documents
AWS_REGION=us-east-1
```

**참고:** 본인의 PostgreSQL 설정에 맞게 수정하세요.

### TypeORM 설정

TypeORM 설정 파일은 `src/config/typeorm.config.ts`. 현재는 PostgreSQL에 연결하도록 되어 있으며, `synchronize: true` 옵션으로 빌드시 엔티티가 스키마에 적용됨.

**⚠️ 운영 환경에서는  `synchronize: false`로 사용.**

## 실행 방법
0. local 환경 세팅: 
   ```bash
   npm run docker:up
   ```
1.  **PostgreSQL 확인:** `.env`에 설정한 내용대로 PostgreSQL이 켜져있는지 확인하세요.

2.  **개발 모드 실행**
    ```bash
    npm run start:dev
    ```

    `http://localhost:3000`에서 접속할 수 있습니다.

3.  **프로덕션 빌드 후 실행**
    ```bash
    npm run build
    npm run start
    ```

## API Endpoints

애플리케이션 실행 후, `http://localhost:3000/api`에서 Swagger UI를 통해 API 엔드포인트를 직접 테스트하고 요청/응답 구조를 확인할 수 있습니다.

### Auth

-   `GET /auth/kakao`: 카카오 OAuth 로그인 흐름을 시작합니다.
-   `GET /auth/kakao/callback`: 카카오 로그인 성공 후 콜백을 처리하고 JWT를 발급합니다.

### Users

-   `GET /users`: 모든 사용자를 조회합니다. (JWT 인증 필요)
-   `GET /users/:id`: 특정 ID의 사용자를 조회합니다.
-   `PUT /users/:id`: 특정 ID의 사용자 정보를 업데이트합니다.
-   `DELETE /users/:id`: 특정 ID의 사용자를 삭제합니다.

### Document Analyzer (단일 분석)

-   `POST /analyses`: 문서를 업로드하여 직접 분석 결과를 받습니다.

### Documents (비동기 분석)

-   `POST /documents`: 문서를 업로드하고 저장합니다. (JWT 인증 필요)
-   `GET /documents/analyze/stream`: 저장된 모든 문서를 분석하고 결과를 SSE로 스트리밍합니다. (JWT 인증 필요)

### Health Check

-   `GET /health`: 서버의 상태를 확인합니다.

## 프로젝트 구조

모듈 기반 레이어드 아키텍처로 구성

```
src/
├── app.module.ts
├── main.ts
├── config/
│   └── typeorm.config.ts
└── modules/
    ├── user/
    │   ├── controllers/
    │   │   └── user.controller.ts
    │   ├── services/
    │   │   └── user.service.ts
    │   ├── entities/
    │   │   └── user.entity.ts
    │   ├── dto/
    │   │   ├── create-user.dto.ts
    │   │   └── update-user.dto.ts
    │   └── user.module.ts
    └── document-analyzer/
        ├── controllers/
        │   └── document-analyzer.controller.ts
        ├── services/
        │   └── document-analyzer.service.ts
        └── document-analyzer.module.ts
```


## 코드 품질

ESLint, Prettier로 코드 품질 관리

-   **린트 검사 및 자동 수정**
    ```bash
    npm run lint
    ```

-   **코드 포맷팅**
    ```bash
    npm run format
    ```

## 성능 최적화

### Estate Analysis API 최적화 (v1.0.0)

`POST /estate-analysis` API의 성능 최적화를 통해 **Gemini AI 토큰 사용량을 70-90% 절감**하고 **응답 시간을 85-90% 단축**했습니다.

#### 주요 개선 사항

1. **Redis 기반 주소 캐싱 전략**
   - **초고속 Redis 캐싱**: O(1) 시간 복잡도, 밀리초 단위
   - OCR 후 추출된 주소로 기존 분석 결과 검색
   - 동일 주소 재분석 시 AI 호출 생략
   - 캐시 히트 시 1-2초 내 응답 (기존 10-15초)
   - TTL 90일 자동 만료

2. **SOLID 원칙 준수 아키텍처**
   - 전략 패턴으로 다양한 캐싱 전략 교체 가능
   - 의존성 역전으로 테스트 용이성 향상
   - 단일 책임으로 유지보수성 개선

3. **스마트 주소 매칭**
   - 주소 정규화 (공백, 특수문자 제거)
   - Levenshtein Distance 기반 유사도 계산
   - 90% 이상 유사 주소 자동 매칭

#### 사용 방법

**일반 분석 (캐시 사용)**
```bash
POST /estate-analysis
{
  "address": "서울특별시 강남구 테헤란로 123",
  "documentIds": [1, 2, 3]
}
```

**강제 재분석 (캐시 무시)**
```bash
POST /estate-analysis
{
  "address": "서울특별시 강남구 테헤란로 123",
  "documentIds": [1, 2, 3],
  "forceReAnalyze": true
}
```

#### 예상 효과

| 지표 | 기존 | 최적화 | 개선율 |
|------|------|--------|--------|
| 응답 시간 (캐시 히트) | 10-15초 | 1-2초 | **85-90% 단축** |
| 토큰 사용량 (50% 중복) | 100% | 50% | **50% 절감** |
| 토큰 사용량 (90% 중복) | 100% | 10% | **90% 절감** |

📖 **상세 문서**: [Estate Analysis 최적화 가이드](./docs/estate-analysis-optimization.md)