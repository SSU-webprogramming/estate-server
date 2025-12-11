# Estate Analysis API 최적화 문서

## ? 개요

`POST /estate-analysis` API의 성능 최적화를 통해 Gemini AI 토큰 사용량을 절감하고 응답 시간을 단축했습니다.

## ? 목표

1. **토큰 비용 절감**: 동일 주소에 대한 중복 AI 요청 방지
2. **응답 시간 단축**: AI 호출 생략으로 5-10초 이상 단축
3. **데이터 일관성**: 같은 주소는 동일한 분석 결과 제공

## ?? 아키텍처 설계 (SOLID 원칙 준수)

### 1. 단일 책임 원칙 (SRP)

각 컴포넌트는 하나의 명확한 책임만 가집니다:

- **`address.util.ts`**: 주소 정규화 및 유사도 계산
- **`AddressBasedCacheStrategyService`**: 주소 기반 캐시 검색 전략
- **`EstateRepository`**: 데이터베이스 접근 로직
- **`EstateAnalysisReportService`**: 비즈니스 로직 조율

### 2. 개방-폐쇄 원칙 (OCP)

새로운 캐싱 전략 추가 시 기존 코드 수정 없이 확장 가능:

```typescript
// 새로운 전략 추가 예시
export class DocumentHashCacheStrategyService implements AnalysisCacheStrategyPort {
  // 문서 해시 기반 캐싱 구현
}

// Module에서 교체만 하면 됨
{
  provide: ANALYSIS_CACHE_STRATEGY_PORT,
  useClass: DocumentHashCacheStrategyService, // 전략 교체
}
```

### 3. 리스코프 치환 원칙 (LSP)

모든 캐싱 전략은 `AnalysisCacheStrategyPort` 인터페이스를 구현하여 상호 교체 가능:

```typescript
interface AnalysisCacheStrategyPort {
  findCachedAnalysis(address: string, userId?: number): Promise<EstateAnalysisReport | null>;
  isCacheable(address: string): boolean;
  getStrategyName(): string;
}
```

### 4. 인터페이스 분리 원칙 (ISP)

캐싱 전략 인터페이스는 필요한 메서드만 정의:

- `findCachedAnalysis`: 캐시 검색
- `isCacheable`: 캐시 가능 여부 확인
- `getStrategyName`: 전략 이름 반환

### 5. 의존성 역전 원칙 (DIP)

상위 모듈(`EstateAnalysisReportService`)은 구체적 구현이 아닌 추상화(`AnalysisCacheStrategyPort`)에 의존:

```typescript
@Injectable()
export class EstateAnalysisReportService {
  constructor(
    @Inject(ANALYSIS_CACHE_STRATEGY_PORT)
    private readonly analysisCacheStrategy: AnalysisCacheStrategyPort, // 추상화에 의존
  ) {}
}
```

## ? 최적화 플로우

### 기존 플로우
```
OCR → AI 분석 요청 (매번) → 결과 저장 → 응답
?? 평균 10-15초
? 매번 토큰 소모
```

### 최적화된 플로우
```
OCR → 주소 추출 → 캐시 검색
              ↓
         캐시 히트? 
         ↙?      ↘?
      YES        NO
       ↓          ↓
   기존 분석    AI 분석
     복사       요청
       ↓          ↓
     응답 ←─────┘
?? 캐시 히트: 1-2초 / 미스: 10-15초
? 캐시 히트 시 토큰 0원
```

## ? 파일 구조

```
src/
├── common/
│   └── utils/
│       └── address.util.ts                    # 주소 정규화 유틸리티
├── modules/
    └── estate-analysis-report/
        ├── ports/
        │   └── analysis-cache-strategy.port.ts # 캐싱 전략 인터페이스
        ├── services/
        │   ├── address-based-cache-strategy.service.ts # 주소 기반 캐싱 전략
        │   └── estate-analysis-report.service.ts       # 메인 서비스 (최적화 로직)
        ├── dto/
        │   └── request/
        │       └── estate-analysis-req.dto.ts  # forceReAnalyze 옵션 추가
        └── estate-analysis-report.module.ts    # 의존성 주입 설정
```

## ? 주요 컴포넌트

### 1. 주소 정규화 유틸리티 (`address.util.ts`)

```typescript
// 주소 정규화
normalizeAddress('서울특별시 강남구 테헤란로 123번지')
// => '서울강남구테헤란로123'

// 주소 유사도 계산 (Levenshtein Distance)
calculateAddressSimilarity('서울 강남구 테헤란로 123', '서울강남구테헤란로123번지')
// => 0.95 (95% 유사)

// 유사 주소 판단
areAddressesSimilar('서울 강남구 테헤란로 123', '서울강남구테헤란로123', 0.85)
// => true
```

### 2. 캐싱 전략 서비스 (`AddressBasedCacheStrategyService`) - Redis 기반

**주요 기능:**
- **Redis를 활용한 초고속 캐싱** (O(1) 시간 복잡도)
- 정규화된 주소를 키로 사용
- TTL 90일 자동 만료
- 메모리 기반 캐시로 DB 쿼리 최소화

**검색 전략:**
1. 주소 정규화 → Redis 키 생성
2. Redis에서 estateId 조회 (밀리초 단위)
3. estateId로 DB에서 분석 결과 조회 (1회만)
4. Redis TTL 자동 만료 관리

**Redis 키 구조:**
```
estate-analysis:by-address:{normalizedAddress}:{userId} → estateId
```

**예시:**
```
estate-analysis:by-address:서울강남구테헤란로123:42 → "1234"
```

### 3. EstateRepository 확장

```typescript
// 정규화된 주소로 분석 결과가 있는 Estate 검색
async findByNormalizedAddress(address: string, userId?: number): Promise<Estate[]>
```

### 4. DTO 확장 (`CreateEstateAnalysisDto`)

```typescript
@ApiProperty({
  description: '강제 재분석 여부 (true: 캐시 무시, false: 캐시 사용)',
  example: false,
  required: false,
  default: false,
})
@IsOptional()
@IsBoolean()
forceReAnalyze?: boolean;
```

## ? 예상 효과

### 토큰 절감
- **시나리오 1**: 동일 주소 10회 분석
  - 기존: 10회 AI 호출 (100% 토큰 소모)
  - 최적화: 1회 AI 호출 + 9회 캐시 (10% 토큰 소모)
  - **절감율: 90%**

- **시나리오 2**: 동일 주소 50% 중복
  - 기존: 100회 AI 호출
  - 최적화: 50회 AI 호출 + 50회 캐시
  - **절감율: 50%**

### 응답 시간 단축
- **캐시 히트**: 10-15초 → 1-2초 (85-90% 단축)
- **캐시 미스**: 10-15초 (동일)

### 사용자 경험 개선
- 동일 주소 재분석 시 즉각적인 응답
- 일관된 분석 결과 제공
- 서버 부하 감소

## ? 사용 방법

### 1. 일반 분석 (캐시 사용)

```bash
POST /estate-analysis
Content-Type: application/json

{
  "address": "서울특별시 강남구 테헤란로 123",
  "addressDetail": "101동 101호",
  "contractType": "전세",
  "deposit": 100000000,
  "documentIds": [1, 2, 3]
}
```

**동작:**
- OCR 후 주소 추출
- 캐시 검색 시도
- 캐시 히트 시 기존 분석 복사 (1-2초)
- 캐시 미스 시 AI 분석 (10-15초)

### 2. 강제 재분석 (캐시 무시)

```bash
POST /estate-analysis
Content-Type: application/json

{
  "address": "서울특별시 강남구 테헤란로 123",
  "addressDetail": "101동 101호",
  "contractType": "전세",
  "deposit": 100000000,
  "documentIds": [1, 2, 3],
  "forceReAnalyze": true  // 캐시 무시
}
```

**동작:**
- 캐시 검색 생략
- 항상 AI 분석 수행 (10-15초)

## ? 캐시 동작 확인

서버 로그에서 캐시 동작을 확인할 수 있습니다:

```
[EstateAnalysisReport] 캐시 검색 시도: 서울특별시 강남구 테헤란로 123
[AddressBasedCache] 정확 일치 캐시 히트: 서울특별시 강남구 테헤란로 123
[EstateAnalysisReport] 캐시 히트! 기존 분석 재사용 (원본 ID: 42)
```

또는

```
[EstateAnalysisReport] 캐시 검색 시도: 서울특별시 강남구 테헤란로 456
[AddressBasedCache] 캐시 미스: 서울특별시 강남구 테헤란로 456
[EstateAnalysisReport] 캐시 미스. AI 분석 요청
```

## ?? 설정 커스터마이징

### 캐시 만료 기간 변경

`AddressBasedCacheStrategyService`에서 수정:

```typescript
private readonly MAX_CACHE_AGE_DAYS = 90; // 90일 → 원하는 일수로 변경
```

### 주소 유사도 임계값 변경

```typescript
private readonly SIMILARITY_THRESHOLD = 0.9; // 90% → 원하는 값으로 변경
```

### 다른 캐싱 전략으로 교체

1. 새 전략 서비스 생성:
```typescript
@Injectable()
export class MyCustomCacheStrategyService implements AnalysisCacheStrategyPort {
  // 구현
}
```

2. Module에서 교체:
```typescript
{
  provide: ANALYSIS_CACHE_STRATEGY_PORT,
  useClass: MyCustomCacheStrategyService,
}
```

## ? 테스트 시나리오

### 시나리오 1: 동일 주소 연속 분석
1. 첫 번째 분석 요청 (캐시 미스, AI 호출)
2. 두 번째 분석 요청 (캐시 히트, 즉시 응답)
3. 결과 비교: 동일한 분석 결과 확인

### 시나리오 2: 유사 주소 분석
1. "서울특별시 강남구 테헤란로 123" 분석
2. "서울 강남구 테헤란로123번지" 분석
3. 캐시 히트 확인 (유사도 90% 이상)

### 시나리오 3: 강제 재분석
1. 캐시된 주소 분석 (캐시 히트)
2. `forceReAnalyze: true`로 재분석
3. AI 호출 확인 (캐시 무시)

### 시나리오 4: 캐시 만료
1. 90일 이전 분석 데이터 생성
2. 동일 주소 분석 요청
3. 캐시 미스 확인 (만료된 캐시)

## ?? 주의사항

### 1. 주소 정규화 한계
- OCR 오류로 주소가 잘못 인식될 경우 잘못된 캐시 매칭 가능
- 예: "123번지" → "128번지" (OCR 오류)

**대응책**: 
- OCR 정확도 향상
- 사용자 주소 입력 권장
- `forceReAnalyze` 옵션 제공

### 2. 법적/건축적 변경사항
- 오래된 캐시 데이터는 최신 정보를 반영하지 못할 수 있음
- 예: 소유권 변경, 근저당권 설정 등

**대응책**:
- 캐시 만료 기간 설정 (기본 90일)
- 중요 거래 시 `forceReAnalyze` 권장

### 3. 개인정보 보호
- 다른 사용자의 분석 결과를 볼 수 있는 문제

**대응책**:
- 현재는 userId로 필터링하여 본인 데이터만 캐시 사용
- 필요시 전체 사용자 캐시 공유로 변경 가능

## ? 모니터링 지표

### 추적해야 할 메트릭
1. **캐시 히트율**: 전체 요청 중 캐시 히트 비율
2. **평균 응답 시간**: 캐시 히트 vs 미스
3. **토큰 사용량**: 월별 토큰 소비량
4. **비용 절감액**: 절감된 토큰 비용

### 로그 분석
```bash
# 캐시 히트 횟수
grep "캐시 히트" logs/app.log | wc -l

# 캐시 미스 횟수
grep "캐시 미스" logs/app.log | wc -l

# 캐시 히트율 계산
캐시 히트율 = 캐시 히트 / (캐시 히트 + 캐시 미스) * 100
```

## ? 향후 개선 방향

### 1. ~~분산 캐시 (Redis)~~ ? 완료
- ~~현재: DB 기반 캐시~~
- ~~개선: Redis 캐시 레이어 추가~~
- ~~효과: 더 빠른 캐시 조회~~
- **v1.0.0에서 구현 완료!**

### 2. 문서 해시 기반 캐싱
- 현재: 주소 기반 캐싱
- 개선: 문서 내용 해시로 캐싱
- 효과: 더 정확한 캐시 매칭

### 3. 캐시 워밍
- 인기 주소 미리 분석
- 첫 요청도 빠른 응답

### 4. 캐시 통계 대시보드
- 실시간 캐시 히트율 모니터링
- 비용 절감액 시각화

## ? 변경 이력

### v1.0.0 (2025-12-11)
- ? 주소 정규화 유틸리티 추가
- ? 주소 기반 캐싱 전략 구현
- ? EstateRepository 확장
- ? forceReAnalyze 옵션 추가
- ? SOLID 원칙 준수 리팩토링

## ? 기여자
- Backend Team

## ? 문의
- 이슈 발생 시 GitHub Issues에 등록
- 개선 제안은 Pull Request로 제출

