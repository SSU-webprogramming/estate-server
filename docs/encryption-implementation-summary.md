# 민감정보 암호화 구현 완료 요약

## 구현 개요

NestJS + TypeORM 환경에서 AES-256-GCM 알고리즘을 사용한 민감정보 양방향 암호화를 구현했습니다.

---

## 구현된 파일 목록

### 1. 핵심 암호화 로직
**파일:** `src/common/utils/encryption.transformer.ts`

- **EncryptionTransformer 클래스**
  - TypeORM의 ValueTransformer 인터페이스 구현
  - AES-256-GCM 암호화 알고리즘 사용
  - 랜덤 IV 생성으로 동일 평문도 다른 암호문 생성
  - Auth Tag를 통한 데이터 무결성 검증
  - 암호화 데이터 형식: `iv:authTag:encryptedData` (hex 인코딩)

- **주요 메서드**
  - `to()`: 데이터베이스 저장 시 자동 암호화
  - `from()`: 데이터베이스 조회 시 자동 복호화
  - `validateEncryptionKey()`: 암호화 키 유효성 검증

- **보안 기능**
  - null/빈 문자열 처리
  - 에러 발생 시 민감정보 미노출
  - 싱글톤 패턴으로 성능 최적화

### 2. 암호화 설정
**파일:** `src/config/encryption.config.ts`

- 환경변수에서 암호화 키 로딩
- 암호화 활성화 여부 설정
- NestJS ConfigModule과 통합

### 3. 환경변수 검증
**파일:** `src/config/env.validation.ts` (수정)

추가된 환경변수:
```typescript
ENCRYPTION_KEY: string        // 필수, 최소 32자
ENCRYPTION_ENABLED?: string   // 선택, 기본값 true
```

### 4. 애플리케이션 모듈
**파일:** `src/app.module.ts` (수정)

- encryption config를 ConfigModule에 로드
- 애플리케이션 시작 시 암호화 키 검증

### 5. 엔티티 수정

#### User 엔티티
**파일:** `src/modules/user/entities/user.entity.ts`

암호화 적용 컬럼:
- `email` (이메일 주소)
  - type: `varchar(255)` → `text`
  - transformer 적용
  
- `username` (사용자명)
  - type: `varchar(100)` → `text`
  - transformer 적용

#### EstateAnalysisReport 엔티티
**파일:** `src/modules/estate-analysis-report/entities/estate-analysis-report.entity.ts`

암호화 적용 컬럼:
- `address` (주소)
  - type: `varchar(255)` → `text`
  - transformer 적용
  
- `currentOwner` (현재 소유자)
  - type: `varchar(100)` → `text`
  - transformer 적용

### 6. 상세 가이드 문서
**파일:** `docs/data-encryption-guide.md`

포함 내용:
- 암호화 개요 및 대상 필드
- 환경변수 설정 방법
- 구현 상세 설명
- 서비스 계층 사용 예시
- 주의사항 및 제약사항
- 보안 체크리스트
- 테스트 가이드
- 문제 해결 가이드

---

## 민감정보 판별 기준 및 결과

### 민감정보 판별 기준
"사용자를 직접 식별하거나 매우 높은 확률로 재식별 가능한 필드"

### User 엔티티 분석

| 컬럼명 | 민감정보 여부 | 이유 |
|--------|--------------|------|
| `email` | ? **암호화 적용** | 개인 식별 가능 정보 |
| `username` | ? **암호화 적용** | 개인 식별 가능 정보 |
| `userId` | ? 미적용 | 시스템 내부 식별자, 단독으로는 재식별 불가 |
| `providerType` | ? 미적용 | 단순 카테고리 정보 |
| `providerId` | ? 미적용 | OAuth 제공자 ID, 외부 시스템 식별자 |
| `role` | ? 미적용 | 권한 정보 |
| `agreedTerms` | ? 미적용 | 동의 여부, 재식별 정보 없음 |

### EstateAnalysisReport 엔티티 분석

| 컬럼명 | 민감정보 여부 | 이유 |
|--------|--------------|------|
| `address` | ? **암호화 적용** | 부동산 위치 = 재산 정보, 개인 식별 가능 |
| `currentOwner` | ? **암호화 적용** | 개인 이름 = 직접 식별 정보 |
| `safetyScore` | ? 미적용 | 분석 결과 수치, 재식별 불가 |
| `buildingStructure` | ? 미적용 | 건물 정보, 주소 없이는 재식별 불가 |
| `buildingUsage` | ? 미적용 | 건물 용도, 일반 정보 |
| `totalFloors` | ? 미적용 | 건물 층수, 일반 정보 |
| `ownershipStatus` | ? 미적용 | 소유권 상태, 카테고리 정보 |
| `transferDate` | ? 미적용 | 날짜 정보, 단독으로는 재식별 불가 |

---

## 기술 스펙

### 암호화 알고리즘
- **알고리즘**: AES-256-GCM
- **키 길이**: 256 bits (32 bytes)
- **IV 길이**: 128 bits (16 bytes)
- **Auth Tag 길이**: 128 bits (16 bytes)
- **인코딩**: Hex

### 암호화 프로세스
```
평문 → [AES-256-GCM 암호화] → iv:authTag:암호문 (hex) → DB 저장
DB 조회 → iv:authTag:암호문 (hex) → [AES-256-GCM 복호화] → 평문
```

### 보안 특징
1. **랜덤 IV**: 동일 평문도 매번 다른 암호문 생성
2. **Auth Tag**: 데이터 무결성 검증 (변조 감지)
3. **환경변수 관리**: 하드코딩 금지
4. **자동 암호화**: TypeORM transformer로 투명한 처리
5. **에러 보호**: 민감정보 로그 미노출

---

## 환경 설정

### 필수 환경변수 추가

`.env` 파일에 다음 항목 추가:

```bash
# 암호화 설정
ENCRYPTION_KEY=your_encryption_key_minimum_32_characters_required_keep_it_secret
ENCRYPTION_ENABLED=true
```

### 암호화 키 생성 방법

**Linux/Mac:**
```bash
openssl rand -base64 32
```

**Node.js:**
```javascript
require('crypto').randomBytes(32).toString('base64')
```

---

## 사용 방법

### 서비스 계층에서의 사용

ValueTransformer가 자동으로 암호화/복호화를 처리하므로, 서비스 계층에서는 **평문으로 작업**합니다.

#### 생성 예시
```typescript
async createUser(dto: CreateUserDto): Promise<User> {
  const user = this.userRepository.create({
    email: dto.email,        // 평문 입력 → 자동 암호화
    username: dto.username,  // 평문 입력 → 자동 암호화
  });
  
  return await this.userRepository.save(user);
  // DB에는 암호화된 상태로 저장됨
}
```

#### 조회 예시
```typescript
async findById(userId: number): Promise<User> {
  const user = await this.userRepository.findOne({
    where: { userId },
  });
  
  // user.email, user.username은 자동으로 복호화된 평문
  return user;
}
```

#### 업데이트 예시
```typescript
async updateUser(userId: number, dto: UpdateUserDto): Promise<User> {
  const user = await this.findById(userId);
  
  user.email = dto.email;        // 평문 입력 → 자동 암호화
  user.username = dto.username;  // 평문 입력 → 자동 암호화
  
  return await this.userRepository.save(user);
}
```

---

## 주요 제약사항

### 1. 암호화된 필드의 검색 제약

? **불가능:**
```typescript
// WHERE 조건으로 직접 검색 불가
const user = await this.userRepository.findOne({
  where: { email: 'test@example.com' }
});
// 동작하지 않음 (암호문이 매번 달라서 비교 불가)
```

? **해결 방안:**

**방안 1: 전체 조회 후 메모리 필터링 (소규모 데이터)**
```typescript
async findByEmail(email: string): Promise<User | null> {
  const users = await this.userRepository.find();
  return users.find(user => user.email === email) || null;
}
```

**방안 2: 해시 인덱스 컬럼 추가 (대규모 데이터)**
```typescript
// 엔티티에 해시 컬럼 추가
@Column({ name: 'email_hash', type: 'varchar', length: 64, unique: true })
emailHash: string;

// 서비스에서 해시로 검색
async findByEmail(email: string): Promise<User | null> {
  const emailHash = crypto.createHash('sha256').update(email).digest('hex');
  return await this.userRepository.findOne({ where: { emailHash } });
}
```

### 2. 암호화 키 변경 불가

?? **중요:** 한 번 설정한 암호화 키는 절대 변경하면 안 됩니다.
- 키를 변경하면 기존 데이터를 복호화할 수 없습니다.
- 키 로테이션이 필요한 경우 별도의 마이그레이션 스크립트 필요

### 3. 성능 영향

- 암호화/복호화 연산은 CPU 자원 소모
- 대량 데이터 조회 시 페이지네이션 권장
- 필요시 Redis 캐싱 활용

---

## 마이그레이션 가이드

### 기존 데이터가 있는 경우

기존 평문 데이터를 암호화하는 마이그레이션이 필요합니다.

```bash
# 1. 마이그레이션 파일 생성
npm run typeorm migration:create src/migrations/EncryptSensitiveData

# 2. 마이그레이션 코드 작성 (docs/data-encryption-guide.md 참조)

# 3. 마이그레이션 실행
npm run typeorm migration:run
```

### 신규 프로젝트인 경우

```bash
# 엔티티 변경사항 기반 마이그레이션 자동 생성
npm run typeorm migration:generate src/migrations/AddEncryption

# 마이그레이션 실행
npm run typeorm migration:run
```

---

## 보안 체크리스트

구현 완료 후 다음 항목을 확인하세요:

- [x] 암호화 키는 환경변수로 관리
- [x] 암호화 키는 최소 32자 이상
- [ ] 개발/운영 환경별 다른 키 사용
- [ ] 암호화 키는 시크릿 관리 시스템에 저장
- [x] 소스코드에 암호화 키 하드코딩 없음
- [x] 로그에 민감정보 출력 금지
- [ ] Git 히스토리에 암호화 키 미포함 확인
- [ ] .env 파일 .gitignore 포함 확인
- [x] 에러 메시지에 민감정보 미포함
- [x] 암호화 필드 검색 제약사항 이해

---

## 다음 단계

### 1. 환경변수 설정
```bash
# .env 파일에 암호화 키 추가
ENCRYPTION_KEY=$(openssl rand -base64 32)
ENCRYPTION_ENABLED=true
```

### 2. 데이터베이스 마이그레이션
```bash
# 마이그레이션 생성 및 실행
npm run typeorm migration:generate src/migrations/AddEncryption
npm run typeorm migration:run
```

### 3. 애플리케이션 시작
```bash
npm run start:dev
```

### 4. 테스트
```bash
# 암호화가 정상 동작하는지 확인
npm run test
```

### 5. 운영 환경 배포 전 확인사항
- [ ] 운영 환경 전용 암호화 키 생성
- [ ] AWS Secrets Manager 등 시크릿 관리 시스템 설정
- [ ] 기존 데이터 암호화 마이그레이션 실행
- [ ] 암호화 키 백업 (안전한 장소에)
- [ ] 검색 기능 정상 동작 확인 (해시 인덱스 등)

---

## 참고 문서

- [상세 가이드](./data-encryption-guide.md): 구현 상세, 사용 예시, 문제 해결
- [NestJS 공식 문서](https://docs.nestjs.com/)
- [TypeORM ValueTransformer](https://typeorm.io/#/entities/column-types-for-postgres)
- [Node.js Crypto](https://nodejs.org/api/crypto.html)

---

## 문의 사항

암호화 구현 관련 문제가 발생하면 `docs/data-encryption-guide.md`의 "문제 해결 가이드" 섹션을 참조하세요.

---

**구현 완료일:** 2024-12-12  
**버전:** 1.0.0  
**구현자:** Backend Engineering Team

