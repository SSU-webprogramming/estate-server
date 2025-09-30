# NestJS 계층형 아키텍처 프로젝트

NestJS로 만든 샘플 애플리케이션입니다. Controller, Service, Repository 구조로 이루어진 계층형 아키텍처를 구현했으며, TypeORM(PostgreSQL), `class-validator`, `class-transformer` 등을 사용했습니다.

## 목차

- [설치 방법](#설치-방법)
- [환경 설정](#환경-설정)
- [실행 방법](#실행-방법)
- [Swagger API 문서](#swagger-api-문서)
- [프로젝트 구조](#프로젝트-구조)
- [문서 분석기 모듈](#문서-분석기-모듈)
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

### 환경 변수

프로젝트 루트에 `.env` 파일을 작성 후 실행:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=webprogramming
GEMINI_API_KEY=YOUR_GEMINI_API_KEY # Google AI Studio에서 발급
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

## Swagger API 문서


-   **Swagger UI:** `http://localhost:3000/api`

API 엔드포인트를 직접 테스트하고 요청/응답 구조를 확인할 수 있다.

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


## 문서 분석기 모듈

`DocumentAnalyzer` 모듈은 Gemini API로 PDF나 JPG 파일을 분석합니다.

-   **`DocumentAnalyzerService` (`src/modules/document-analyzer/services/document-analyzer.service.ts`):** 업로드한 파일을 Gemini API에 보내고 분석 결과를 받아옵니다.
-   **`DocumentAnalyzerController` (`src/modules/document-analyzer/controllers/document-analyzer.controller.ts`):** `POST /analyses` 엔드포인트로 PDF/JPG 파일 업로드를 처리합니다. 파일 크기랑 형식을 확인한 다음 `DocumentAnalyzerService`를 호출합니다.

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