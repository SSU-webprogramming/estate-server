# NestJS 계층형 아키텍처 프로젝트

이 프로젝트는 TypeORM (PostgreSQL), `class-validator`, `class-transformer`를 사용하여 계층형 아키텍처 (Controller, Service, Repository)로 설정된 기본적인 NestJS 애플리케이션입니다.

## 목차

- [설치](#설치)
- [구성](#구성)
- [애플리케이션 실행](#애플리케이션-실행)
- [프로젝트 구조](#프로젝트-구조)
- [사용자 모듈 예시](#사용자-모듈-예시)
- [코드 품질](#코드-품질)

## 설치

1.  **저장소 복제 (해당하는 경우):**
    ```bash
    git clone <your-repository-url>
    cd <your-project-name>
    ```

2.  **종속성 설치:**
    ```bash
    npm install
    ```

## 구성

### 환경 변수

프로젝트 루트에 다음 데이터베이스 구성으로 `.env` 파일을 생성합니다:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=webprogramming
```

**참고:** PostgreSQL 설정에 따라 이 값을 조정하십시오.

### TypeORM

TypeORM 구성은 `src/config/typeorm.config.ts`에 있습니다. PostgreSQL 데이터베이스에 연결하도록 설정되어 있습니다. `synchronize: true` 옵션은 개발 목적으로 활성화되어 있으며, 엔티티를 기반으로 데이터베이스 테이블을 자동으로 생성합니다. **프로덕션 환경에서는 `synchronize: false`로 설정하고 데이터베이스 마이그레이션을 사용하는 것이 좋습니다.**

## 애플리케이션 실행

1.  **PostgreSQL 시작:** `.env` 파일에 제공된 자격 증명으로 PostgreSQL 데이터베이스가 실행 중이고 액세스 가능한지 확인하십시오.

2.  **개발 모드에서 애플리케이션 실행:**
    ```bash
    npm run start:dev
    ```

    애플리케이션은 `http://localhost:3000`에서 액세스할 수 있습니다.

3.  **프로덕션 모드에서 빌드 및 실행:**
    ```bash
    npm run build
    npm run start
    ```

4.  **Docker Compose로 애플리케이션 실행 (권장):**
    ```bash
    npm run docker:up
    ```
    이 명령은 백그라운드에서 PostgreSQL 데이터베이스와 NestJS 애플리케이션을 모두 빌드하고 시작합니다. 애플리케이션은 `http://localhost:3000`에서 액세스할 수 있습니다.

    Docker Compose 서비스를 중지하려면 다음을 실행하십시오:
    ```bash
    docker-compose down
    ```

## 프로젝트 구조

프로젝트는 다음과 같이 모듈이 구성된 계층형 아키텍처를 따릅니다:

```
src/
├── app.module.ts
├── main.ts
├── config/
│   └── typeorm.config.ts
└── modules/
    └── user/
        ├── controllers/
        │   └── user.controller.ts
        ├── services/
        │   └── user.service.ts
        ├── repositories/
        │   └── user.repository.ts
        ├── entities/
        │   └── user.entity.ts
        ├── dto/
        │   ├── create-user.dto.ts
        │   └── update-user.dto.ts
        └── user.module.ts
```

## 사용자 모듈 예시

`User` 모듈은 계층형 아키텍처를 보여줍니다:

-   **`UserEntity` (`src/modules/user/entities/user.entity.ts`):** TypeORM 데코레이터를 사용하여 사용자 데이터베이스 스키마를 정의합니다.
-   **`UserRepository` (`src/modules/user/repositories/user.repository.ts`):** `User` 엔티티에 대한 사용자 지정 데이터베이스 상호 작용 메서드를 제공하기 위해 TypeORM의 `Repository`를 확장합니다.
-   **`UserService` (`src/modules/user/services/user.service.ts`):** `UserRepository`와 상호 작용하여 사용자 관련 작업에 대한 비즈니스 로직을 포함합니다.
-   **`UserController` (`src/modules/user/controllers/user.controller.ts`):** 들어오는 HTTP 요청을 처리하고, `UserService`에 위임하고, 응답을 반환합니다. 사용자 생성, 검색, 업데이트 및 삭제를 위한 API 엔드포인트를 정의합니다.
-   **`CreateUserDto` 및 `UpdateUserDto` (`src/modules/user/dto/`):** `class-validator`를 사용하여 들어오는 요청 페이로드를 유효성 검사하는 데 사용되는 데이터 전송 객체(DTO)입니다.

## 코드 품질

ESLint 및 Prettier는 코드 품질 및 일관성을 유지하도록 구성되어 있습니다. 다음 명령을 사용하여 실행할 수 있습니다:

-   **린트 및 문제 해결:**
    ```bash
    npm run lint
    ```

-   **코드 형식 지정:**
    ```bash
    npm run format
    ```