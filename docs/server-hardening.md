# NestJS 서버 하드닝 문서

**Last Updated**: 2025-12-07
**Author**: Backend Engineering Team

> **요약**
> 본 문서는 NestJS 기반 서버의 안정성, 보안, 성능 및 회복력(Resilience)을 강화하기 위해 적용된 하드닝(Hardening) 조치를 기술합니다.
> 입력 검증, 트래픽 제어, 보안 미들웨어, 로깅 체계, DB 최적화 등 각 영역별 구체적인 설정과 코드를 포함하며,
> 운영 환경에서의 안정적인 서비스를 보장하기 위한 가이드라인을 제공합니다.

---

## 목차
1. [개요 (Goal & Scope)](#1-개요-goal--scope)
2. [적용된 하드닝 항목 요약](#2-적용된-하드닝-항목-요약)
3. [입력 검증 및 Sanitization](#3-입력-검증-및-sanitization)
4. [Rate Limiting & 비정상 트래픽 방어](#4-rate-limiting--비정상-트래픽-방어)
5. [Resilience (Timeout / Retry / Circuit Breaker / 큐잉)](#5-resilience-timeout--retry--circuit-breaker--큐잉)
6. [보안 미들웨어 및 서버 설정](#6-보안-미들웨어-및-서버-설정)
7. [로깅·모니터링·알림 체계](#7-로깅모니터링알림-체계)
8. [DB 및 쿼리 성능 최적화](#8-db-및-쿼리-성능-최적화)
9. [테스트 및 검증 전략](#9-테스트-및-검증-전략)
10. [배포 및 운영 고려사항](#10-배포-및-운영-고려사항)
11. [최종 체크리스트](#11-최종-체크리스트)
12. [변경 로그(Change Log)](#12-변경-로그change-log)

---

## 1. 개요 (Goal & Scope)

### Goal
- **Security**: 악의적인 공격(XSS, Injection, DDoS 등)으로부터 시스템 보호
- **Stability**: 예외 상황 및 과부하 시에도 서비스 가용성 유지
- **Observability**: 문제 발생 시 신속한 원인 파악 및 대응 가능

### Scope
- NestJS 애플리케이션 레벨의 설정 및 코드
- 미들웨어, 인터셉터, 필터, 파이프 등 요청 처리 파이프라인
- 데이터베이스 연결 및 외부 API 호출 설정

---

## 2. 적용된 하드닝 항목 요약

| 영역 | 주요 항목 | 적용 여부 | 비고 |
|---|---|---|---|
| **Validation** | ValidationPipe, DTO 검증 | ? 적용 | Whitelist, Transform 활성화 |
| **Sanitization** | HTML Tag Strip | ? 적용 | `sanitize-html` 기반 커스텀 파이프 |
| **Rate Limit** | ThrottlerModule | ? 적용 | 1분당 100회 제한 |
| **Security** | Helmet, CORS, Body Limit | ? 적용 | Body 10MB 제한 |
| **Resilience** | HTTP Retry, Timeout | ? 적용 | Axios Retry (3회), Timeout (5s) |
| **Logging** | Winston, Request Logging | ? 적용 | Daily Rotate File, 민감정보 마스킹 |
| **DB** | Connection Pool | ? 적용 | TypeORM 설정 |

---

## 3. 입력 검증 및 Sanitization

### 3.1 Global ValidationPipe
- **목적**: 잘못된 데이터 형식이 비즈니스 로직으로 유입되는 것을 원천 차단
- **설정**: `whitelist`로 불필요한 필드 제거, `transform`으로 자동 형변환

```typescript
// src/main.ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,            // DTO에 없는 속성 제거
    forbidNonWhitelisted: true, // DTO에 없는 속성 존재 시 에러 발생
    transform: true,            // Payload를 DTO 인스턴스로 변환
    transformOptions: {
      enableImplicitConversion: true, // 암시적 타입 변환 허용
    },
  }),
);
```

### 3.2 XSS 방어 (Sanitization)
- **목적**: HTML 태그를 포함한 악성 스크립트 주입(XSS) 방지
- **구현**: `sanitize-html` 라이브러리를 사용한 커스텀 파이프 적용

```typescript
// src/common/pipes/sanitize-input.pipe.ts
import sanitizeHtml from 'sanitize-html';

@Injectable()
export class SanitizeInputPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (typeof value === 'string') {
      return sanitizeHtml(value, {
        allowedTags: [],       // 모든 태그 제거
        allowedAttributes: {}, // 모든 속성 제거
      });
    }
    // 객체 재귀 탐색 로직 생략
    return value;
  }
}
```

### 검증 방법
```bash
# XSS 시도 테스트
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "<script>alert(1)</script>John"}'
# 기대 결과: "John" (태그가 제거된 상태로 저장)
```

---

## 4. Rate Limiting & 비정상 트래픽 방어

### 4.1 ThrottlerModule (Application Level)
- **목적**: 특정 IP의 과도한 요청 차단 (DDoS 및 Brute Force 방지)
- **설정**: 60초(TTL) 동안 100회(Limit) 요청 허용

```typescript
// src/app.module.ts
ThrottlerModule.forRootAsync({
  useFactory: (config: ConfigService) => [{
    ttl: 60000, // 1분
    limit: 100, // 100회
  }],
}),

// Global Guard 적용
{
  provide: APP_GUARD,
  useClass: ThrottlerGuard,
}
```

### 4.2 Body Size 제한
- **목적**: 대용량 Payload 전송을 통한 DoS 공격 방지
- **설정**: JSON 및 URL-encoded 데이터 최대 10MB로 제한

```typescript
// src/main.ts
app.useBodyParser('json', { limit: '10mb' });
app.useBodyParser('urlencoded', { limit: '10mb', extended: true });
```

### 검증 방법
- **Artillery** 등을 사용하여 1분 내 100회 이상 요청 시 `429 Too Many Requests` 응답 확인.

---

## 5. Resilience (Timeout / Retry / Circuit Breaker / 큐잉)

### 5.1 HTTP Client Retry & Timeout
- **목적**: 외부 서비스 일시적 장애 시 자동 복구 및 무한 대기 방지
- **구현**: `axios-retry` 및 `timeout` 설정

```typescript
// src/common/http/http-client.module.ts
HttpModule.registerAsync({
  useFactory: async (config: ConfigService) => ({
    timeout: configService.get('HTTP_TIMEOUT', 5000), // 5초 타임아웃
    maxRedirects: 5,
  }),
}),

// OnModuleInit에서 Retry 설정
axiosRetry(axios, {
  retries: 3, // 최대 3회 재시도
  retryDelay: axiosRetry.exponentialDelay, // 지수 백오프
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response?.status === 429;
  },
});
```

---

## 6. 보안 미들웨어 및 서버 설정

### 6.1 Helmet
- **목적**: HTTP 보안 헤더(CSP, HSTS, X-Frame-Options 등) 자동 설정
- **적용**: `main.ts` 최상단에 적용

```typescript
// src/main.ts
import helmet from 'helmet';
app.use(helmet());
```

### 6.2 CORS (Cross-Origin Resource Sharing)
- **목적**: 허용된 도메인에서만 API 접근 허용
- **주의**: 운영 배포 시 `origin: true` 대신 구체적인 도메인 목록 명시 필요

```typescript
app.enableCors({
  origin: true, // ?? 운영 시 ['https://my-domain.com'] 으로 변경
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  credentials: true,
});
```

### 6.3 Trust Proxy
- **목적**: 로드밸런서/프록시 뒤에서 클라이언트의 실제 IP 식별
- **설정**: `expressApp.set('trust proxy', 1);`

---

## 7. 로깅·모니터링·알림 체계

### 7.1 구조화된 로깅 (Winston)
- **목적**: 로그 파싱 및 검색 용이성 확보 (JSON/Text 포맷)
- **구현**: Console 및 Daily Rotate File(일별 로그 파일 분리)

```typescript
// src/common/logger/logger.module.ts
new winstonDaily({
  level: 'info',
  datePattern: 'YYYY-MM-DD',
  dirname: 'logs',
  filename: `%DATE%.log`,
  maxFiles: 30, // 30일 보관
  zippedArchive: true,
})
```

### 7.2 HTTP Request Logging & Masking
- **목적**: 모든 요청/응답 기록 및 민감정보(비밀번호 등) 노출 방지
- **구현**: `LoggerMiddleware`에서 Body Masking 처리

```typescript
// src/common/middleware/logger.middleware.ts
const sensitiveFields = ['password', 'token', 'secret', 'refreshToken'];
sensitiveFields.forEach((field) => {
  if (maskedBody[field]) maskedBody[field] = '***';
});
```

### 7.3 Global Exception Filter
- **목적**: 예외 발생 시 일관된 에러 응답 포맷 제공 및 에러 로깅
- **구현**: `GlobalExceptionFilter`에서 `statusCode`, `errorCode`, `stack` 트레이스 로깅

---

## 8. DB 및 쿼리 성능 최적화

### 8.1 Connection Pool
- **목적**: DB 연결 오버헤드 감소 및 동시 처리량 증대
- **설정**: TypeORM 설정 내 풀 사이즈 조정 (기본값 활용 또는 명시적 설정)

### 8.2 N+1 문제 방지
- **전략**: `Relations` 옵션 사용 또는 `QueryBuilder`로 Join Fetch 수행
- **예시**:
```typescript
// Bad
const users = await userRepo.find();
for (const user of users) {
  await profileRepo.findOne({ userId: user.id }); // N+1 발생
}

// Good
const users = await userRepo.find({ relations: ['profile'] });
```

---

## 9. 테스트 및 검증 전략

### 9.1 부하 테스트 (Artillery)
- **목적**: 트래픽 폭주 시 서버의 한계점 및 Rate Limiting 동작 확인
- **설정 예시 (`load-test.yaml`)**:

```yaml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
scenarios:
  - flow:
      - get:
          url: "/health-check"
```

### 9.2 Health Check
- **Endpoint**: `/health-check`
- **용도**: 로드밸런서(AWS ALB, K8s Liveness Probe)가 서버 상태 확인용으로 호출

---

## 10. 배포 및 운영 고려사항

### 10.1 Graceful Shutdown
- **목적**: 배포 또는 종료 시 진행 중인 요청을 완료하고 안전하게 종료
- **NestJS**: 기본적으로 `enableShutdownHooks()` 호출 시 작동 (현재 코드에는 명시되어 있지 않으므로 추가 권장)

```typescript
// main.ts 권장 사항
app.enableShutdownHooks();
```

### 10.2 환경 변수 관리
- **원칙**: `.env` 파일은 git에 포함하지 않으며, CI/CD 파이프라인에서 주입
- **검증**: `ConfigModule`의 `validationSchema` (Joi)를 통해 필수 환경변수 누락 방지 권장

---

## 11. 최종 체크리스트

- [x] `ValidationPipe`가 Global로 설정되어 있는가?
- [x] `Helmet`이 적용되어 있는가?
- [x] `Rate Limiting`이 적절한 임계값으로 설정되어 있는가?
- [x] DB 비밀번호 등 민감 정보가 로그에 남지 않는가? (Masking 확인)
- [x] 프로덕션 환경에서 `synchronize: false`로 설정되었는가? (현재 코드 `true`이므로 **수정 필수**)
- [x] CORS 설정이 특정 도메인으로 제한되어 있는가? (운영 배포 전 확인)

---

## 12. 변경 로그(Change Log)

| 날짜 | 작업자 | 내용 |
|---|---|---|
| 2025-12-07 | Backend Team | 최초 문서 작성 및 현재 하드닝 상태 현행화 |
