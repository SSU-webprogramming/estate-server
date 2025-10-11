# NestJS 계층형 아키텍처 프로젝트

NestJS로 만든 샘플 애플리케이션입니다. Controller, Service, Repository 구조로 이루어진 계층형 아키텍처를 구현했으며, TypeORM(PostgreSQL), `class-validator`, `class-transformer` 등을 사용했습니다.

## 목차

- [설치 방법](#설치-방법)
- [환경 설정](#환경-설정)
- [실행 방법](#실행-방법)
- [Swagger API 문서](#swagger-api-문서)
- [프로젝트 구조](#프로젝트-구조)
- [코드 품질](#코드-품질)

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