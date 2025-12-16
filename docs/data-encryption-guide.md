# 데이터 암호화 구현 가이드

## 개요

본 문서는 Estate Server (NestJS + TypeORM)에서 민감정보 암호화 구현에 대한 상세 가이드입니다. 사용자 이메일, 주소, 소유자명 등의 개인정보를 AES-256-GCM 알고리즘으로 암호화하여 안전하게 보호합니다.

### 암호화 대상 필드

#### User 엔티티
- `email`: 이메일 주소 (개인 식별 가능)
- `username`: 사용자명 (개인 식별 가능)

#### EstateAnalysisReport 엔티티
- `address`: 주소 (개인 식별 및 재산 정보)
- `currentOwner`: 현재 소유자 (개인 식별 가능)

### 암호화 방식

- **알고리즘**: AES-256-GCM
- **키 길이**: 256 bits (32 bytes)
- **IV**: 매번 랜덤 생성 (128 bits)
- **Auth Tag**: 데이터 무결성 검증용 (128 bits)
- **인코딩**: Hex

### 암호화 데이터 형식

```
iv:authTag:encryptedData
```

각 부분은 hex로 인코딩되어 콜론(:)으로 구분됩니다.

---

## 환경 변수 설정

### .env 파일 예시

```bash
# ==========================================
# 암호화 설정
# ==========================================
# 민감정보 암호화에 사용되는 키
# 최소 32자 이상의 안전한 랜덤 문자열을 사용하세요
# 생성 예시: openssl rand -base64 32
# ?? 주의: 운영 환경과 개발 환경에서 반드시 다른 키를 사용하세요
# ?? 한 번 설정한 키는 변경하면 기존 암호화된 데이터를 복호화할 수 없습니다
ENCRYPTION_KEY=your_encryption_key_minimum_32_characters_required_keep_it_secret

# 암호화 활성화 여부 (기본값: true)
# 테스트 환경에서만 false로 설정 가능
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

## 구현 상세

### 1. EncryptionTransformer 구현

`src/common/utils/encryption.transformer.ts`

```typescript
import { ValueTransformer } from 'typeorm';
import * as crypto from 'crypto';
import { CustomException } from '@/common/errors/custom-exception';
import { ErrorCode } from '@/common/errors/error';

export class EncryptionTransformer implements ValueTransformer {
  private readonly algorithm = 'aes-256-gcm';
  private readonly ivLength = 16;
  private readonly authTagLength = 16;
  private readonly encoding: BufferEncoding = 'hex';
  private readonly key: Buffer;

  constructor(encryptionKey: string) {
    this.validateEncryptionKey(encryptionKey);
    this.key = crypto.createHash('sha256').update(encryptionKey).digest();
  }

  private validateEncryptionKey(key: string): void {
    if (!key || key.trim().length === 0) {
      throw new CustomException(
        ErrorCode.INTERNAL_SERVER_ERROR,
        '암호화 키가 설정되지 않았습니다.',
      );
    }

    if (key.length < 32) {
      throw new CustomException(
        ErrorCode.INTERNAL_SERVER_ERROR,
        '암호화 키는 최소 32자 이상이어야 합니다.',
      );
    }
  }

  to(value: string | null): string | null {
    if (value === null || value === undefined || value.trim() === '') {
      return null;
    }

    try {
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

      let encrypted = cipher.update(value, 'utf8', this.encoding);
      encrypted += cipher.final(this.encoding);

      const authTag = cipher.getAuthTag();

      return `${iv.toString(this.encoding)}:${authTag.toString(this.encoding)}:${encrypted}`;
    } catch (error) {
      throw new CustomException(
        ErrorCode.INTERNAL_SERVER_ERROR,
        '데이터 암호화에 실패했습니다.',
      );
    }
  }

  from(value: string | null): string | null {
    if (value === null || value === undefined || value.trim() === '') {
      return null;
    }

    try {
      const parts = value.split(':');
      
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const [ivHex, authTagHex, encryptedData] = parts;
      const iv = Buffer.from(ivHex, this.encoding);
      const authTag = Buffer.from(authTagHex, this.encoding);

      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedData, this.encoding, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new CustomException(
        ErrorCode.INTERNAL_SERVER_ERROR,
        '데이터 복호화에 실패했습니다.',
      );
    }
  }
}

// 싱글톤 패턴으로 구현
const transformerCache = new Map<string, EncryptionTransformer>();

export function createEncryptionTransformer(encryptionKey: string): EncryptionTransformer {
  if (!transformerCache.has(encryptionKey)) {
    transformerCache.set(encryptionKey, new EncryptionTransformer(encryptionKey));
  }
  return transformerCache.get(encryptionKey)!;
}
```

### 2. 암호화 Config 설정

`src/config/encryption.config.ts`

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('encryption', () => ({
  key: process.env.ENCRYPTION_KEY,
  algorithm: 'aes-256-gcm' as const,
  enabled: process.env.ENCRYPTION_ENABLED !== 'false',
}));
```

### 3. 환경변수 검증 추가

`src/config/env.validation.ts`에 다음 필드 추가:

```typescript
// === 암호화 설정 ===
@IsString()
@MinLength(32, { message: 'ENCRYPTION_KEY는 최소 32자 이상이어야 합니다.' })
ENCRYPTION_KEY: string;

@IsString()
@IsOptional()
ENCRYPTION_ENABLED?: string;
```

### 4. AppModule 설정

`src/app.module.ts`에서 encryption config 로드:

```typescript
import encryptionConfig from '@/config/encryption.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [redisConfig, encryptionConfig],
      validate,
    }),
    // ... 기타 imports
  ],
})
export class AppModule {}
```

### 5. 엔티티에 암호화 적용

#### User 엔티티 예시

```typescript
import { getEncryptionTransformer } from '@/common/utils/encryption.transformer';

@Entity('users')
export class User {
  @Column({ 
    name: 'email',
    type: 'text', // varchar에서 text로 변경
    unique: true,
    comment: '이메일 주소 (암호화)',
    transformer: getEncryptionTransformer(),
  })
  email: string;

  @Column({ 
    name: 'username',
    type: 'text', // varchar에서 text로 변경
    nullable: true,
    comment: '사용자명 (암호화)',
    transformer: getEncryptionTransformer(),
  })
  username: string | null;
}
```

**주의:** `getEncryptionTransformer()`는 싱글톤 패턴으로 구현되어 있으며, 환경변수에서 lazy하게 암호화 키를 가져옵니다. 따라서 엔티티 로드 시점이 아닌 실제 사용 시점에 키를 검증합니다.

#### EstateAnalysisReport 엔티티 예시

```typescript
import { getEncryptionTransformer } from '@/common/utils/encryption.transformer';

@Entity('estate_analysis_report')
export class EstateAnalysisReport {
  @Column({ 
    name: 'address', 
    type: 'text', // varchar에서 text로 변경
    comment: '주소 (암호화)',
    transformer: getEncryptionTransformer(),
  })
  address: string;

  @Column({ 
    name: 'current_owner', 
    type: 'text', // varchar에서 text로 변경
    nullable: true,
    comment: '현재 소유자 (암호화)',
    transformer: getEncryptionTransformer(),
  })
  currentOwner: string | null;
}
```

---

## 서비스 계층에서의 사용

### 기본 사용 예시

ValueTransformer가 자동으로 암호화/복호화를 처리하므로, 서비스 계층에서는 평문으로 작업할 수 있습니다.

#### UserService 예시

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/request/create-user.dto';
import { UserResponseDto } from './dto/response/user-response.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * 사용자 생성
   * - email, username은 자동으로 암호화되어 DB에 저장됨
   */
  async createUser(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const user = this.userRepository.create({
      email: createUserDto.email, // 평문으로 전달
      username: createUserDto.username, // 평문으로 전달
      providerType: createUserDto.providerType,
      providerId: createUserDto.providerId,
    });

    const savedUser = await this.userRepository.save(user);
    
    // 저장 후 조회 시 자동으로 복호화됨
    return this.toResponseDto(savedUser);
  }

  /**
   * 이메일로 사용자 조회
   * - 조회 시 자동으로 복호화됨
   */
  async findByEmail(email: string): Promise<User | null> {
    // TypeORM의 where 조건에서는 암호화된 값으로 비교할 수 없음
    // 따라서 전체 조회 후 메모리에서 필터링하거나, 별도의 인덱싱 전략 필요
    const users = await this.userRepository.find();
    return users.find(user => user.email === email) || null;
  }

  /**
   * 사용자 ID로 조회
   * - 조회 시 민감정보가 자동으로 복호화됨
   */
  async findById(userId: number): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { userId },
    });
  }

  /**
   * 사용자 정보 업데이트
   * - 업데이트 시 자동으로 암호화됨
   */
  async updateUser(userId: number, updateData: Partial<CreateUserDto>): Promise<UserResponseDto> {
    const user = await this.findById(userId);
    
    if (!user) {
      throw new CustomException(ErrorCode.USER_NOT_FOUND, '사용자를 찾을 수 없습니다.');
    }

    // 평문으로 업데이트 (자동으로 암호화됨)
    if (updateData.email) {
      user.email = updateData.email;
    }
    if (updateData.username) {
      user.username = updateData.username;
    }

    const savedUser = await this.userRepository.save(user);
    return this.toResponseDto(savedUser);
  }

  private toResponseDto(user: User): UserResponseDto {
    // 복호화된 데이터가 그대로 DTO로 변환됨
    return {
      userId: user.userId,
      email: user.email, // 이미 복호화된 평문
      username: user.username, // 이미 복호화된 평문
      role: user.role,
      createdAt: user.createdAt,
    };
  }
}
```

#### EstateAnalysisReportService 예시

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EstateAnalysisReport } from './entities/estate-analysis-report.entity';
import { CreateAnalysisReportDto } from './dto/request/create-analysis-report.dto';
import { AnalysisReportResponseDto } from './dto/response/analysis-report-response.dto';

@Injectable()
export class EstateAnalysisReportService {
  constructor(
    @InjectRepository(EstateAnalysisReport)
    private readonly analysisReportRepository: Repository<EstateAnalysisReport>,
  ) {}

  /**
   * 분석 리포트 생성
   * - address, currentOwner는 자동으로 암호화되어 저장됨
   */
  async createReport(dto: CreateAnalysisReportDto): Promise<AnalysisReportResponseDto> {
    const report = this.analysisReportRepository.create({
      estateId: dto.estateId,
      address: dto.address, // 평문으로 전달 (자동 암호화)
      currentOwner: dto.currentOwner, // 평문으로 전달 (자동 암호화)
      safetyScore: dto.safetyScore,
      buildingStructure: dto.buildingStructure,
      // ... 기타 필드
    });

    const savedReport = await this.analysisReportRepository.save(report);
    return this.toResponseDto(savedReport);
  }

  /**
   * 분석 리포트 조회
   * - 조회 시 민감정보가 자동으로 복호화됨
   */
  async findById(reportId: number): Promise<EstateAnalysisReport | null> {
    return await this.analysisReportRepository.findOne({
      where: { id: reportId },
      relations: ['estate'],
    });
  }

  /**
   * 특정 부동산의 분석 리포트 조회
   */
  async findByEstateId(estateId: number): Promise<EstateAnalysisReport | null> {
    return await this.analysisReportRepository.findOne({
      where: { estateId },
    });
  }

  private toResponseDto(report: EstateAnalysisReport): AnalysisReportResponseDto {
    return {
      id: report.id,
      estateId: report.estateId,
      address: report.address, // 이미 복호화된 평문
      currentOwner: report.currentOwner, // 이미 복호화된 평문
      safetyScore: report.safetyScore,
      analyzedAt: report.analyzedAt,
      // ... 기타 필드
    };
  }
}
```

---

## 주의사항 및 제약사항

### 1. 암호화된 필드의 검색 제약

**문제점:**
- 암호화된 필드는 WHERE 조건으로 직접 검색할 수 없습니다.
- 동일한 평문이라도 매번 다른 IV를 사용하므로 암호문이 다릅니다.

**해결 방안:**

#### 방안 1: 전체 조회 후 메모리 필터링 (소규모 데이터)

```typescript
async findByEmail(email: string): Promise<User | null> {
  const users = await this.userRepository.find();
  return users.find(user => user.email === email) || null;
}
```

#### 방안 2: 해시 인덱스 컬럼 추가 (대규모 데이터)

```typescript
@Entity('users')
export class User {
  @Column({ 
    name: 'email',
    type: 'text',
    transformer: createEncryptionTransformer(process.env.ENCRYPTION_KEY || ''),
  })
  email: string;

  // 검색용 해시 컬럼 추가
  @Column({ 
    name: 'email_hash',
    type: 'varchar',
    length: 64,
    unique: true,
  })
  emailHash: string;
}

// Service에서 사용
async createUser(dto: CreateUserDto): Promise<User> {
  const emailHash = crypto.createHash('sha256').update(dto.email).digest('hex');
  
  const user = this.userRepository.create({
    email: dto.email,
    emailHash: emailHash, // 검색용 해시
  });

  return await this.userRepository.save(user);
}

async findByEmail(email: string): Promise<User | null> {
  const emailHash = crypto.createHash('sha256').update(email).digest('hex');
  return await this.userRepository.findOne({
    where: { emailHash },
  });
}
```

### 2. 암호화 키 관리

**중요:**
- 한 번 설정한 암호화 키는 절대 변경하면 안 됩니다.
- 키를 변경하면 기존 암호화된 데이터를 복호화할 수 없습니다.
- 개발/스테이징/운영 환경별로 다른 키를 사용하세요.
- 키는 안전한 시크릿 관리 시스템(AWS Secrets Manager, HashiCorp Vault 등)에 저장하세요.

**키 로테이션이 필요한 경우:**

```typescript
// 1. 새로운 암호화 키 환경변수 추가
ENCRYPTION_KEY_NEW=new_encryption_key

// 2. 마이그레이션 스크립트 작성
async function rotateEncryptionKeys() {
  const oldTransformer = createEncryptionTransformer(process.env.ENCRYPTION_KEY);
  const newTransformer = createEncryptionTransformer(process.env.ENCRYPTION_KEY_NEW);

  const users = await userRepository.find();
  
  for (const user of users) {
    // 기존 암호화된 데이터를 수동으로 복호화
    const rawEmail = oldTransformer.from(user.email);
    // 새로운 키로 재암호화
    user.email = newTransformer.to(rawEmail);
    await userRepository.save(user);
  }
}
```

### 3. 성능 고려사항

- 암호화/복호화 연산은 CPU 자원을 소모합니다.
- 대량의 데이터를 조회할 때는 페이지네이션을 사용하세요.
- 필요한 경우 Redis 등의 캐싱을 활용하세요.

### 4. 로깅 시 주의사항

**절대 하지 말아야 할 것:**

```typescript
// ? 나쁜 예시 - 민감정보가 로그에 노출됨
logger.error(`사용자 생성 실패: email=${user.email}, username=${user.username}`);

// ? 좋은 예시 - 식별자만 로깅
logger.error(`사용자 생성 실패: userId=${user.userId}`);
```

### 5. 마이그레이션 시 주의사항

기존 데이터가 있는 경우, 마이그레이션 스크립트를 작성하여 암호화를 적용해야 합니다.

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';
import { User } from '../entities/user.entity';
import { createEncryptionTransformer } from '@/common/utils/encryption.transformer';

export class EncryptUserData1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const transformer = createEncryptionTransformer(process.env.ENCRYPTION_KEY);
    
    // 1. 컬럼 타입 변경
    await queryRunner.query(`
      ALTER TABLE users 
      ALTER COLUMN email TYPE text,
      ALTER COLUMN username TYPE text
    `);

    // 2. 기존 데이터 암호화
    const users = await queryRunner.query(`SELECT user_id, email, username FROM users`);
    
    for (const user of users) {
      const encryptedEmail = transformer.to(user.email);
      const encryptedUsername = user.username ? transformer.to(user.username) : null;
      
      await queryRunner.query(
        `UPDATE users SET email = $1, username = $2 WHERE user_id = $3`,
        [encryptedEmail, encryptedUsername, user.user_id]
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const transformer = createEncryptionTransformer(process.env.ENCRYPTION_KEY);
    
    // 1. 데이터 복호화
    const users = await queryRunner.query(`SELECT user_id, email, username FROM users`);
    
    for (const user of users) {
      const decryptedEmail = transformer.from(user.email);
      const decryptedUsername = user.username ? transformer.from(user.username) : null;
      
      await queryRunner.query(
        `UPDATE users SET email = $1, username = $2 WHERE user_id = $3`,
        [decryptedEmail, decryptedUsername, user.user_id]
      );
    }

    // 2. 컬럼 타입 원복
    await queryRunner.query(`
      ALTER TABLE users 
      ALTER COLUMN email TYPE varchar(255),
      ALTER COLUMN username TYPE varchar(100)
    `);
  }
}
```

---

## 보안 체크리스트

- [ ] 암호화 키는 환경변수로 관리되고 있는가?
- [ ] 암호화 키는 최소 32자 이상인가?
- [ ] 개발/운영 환경별로 다른 암호화 키를 사용하는가?
- [ ] 암호화 키는 시크릿 관리 시스템에 안전하게 저장되어 있는가?
- [ ] 소스코드에 암호화 키가 하드코딩되어 있지 않은가?
- [ ] 로그에 민감정보가 출력되지 않는가?
- [ ] Git 히스토리에 암호화 키가 커밋되지 않았는가?
- [ ] .env 파일이 .gitignore에 포함되어 있는가?
- [ ] 에러 메시지에 민감정보가 포함되지 않는가?
- [ ] 암호화된 필드의 검색 제약사항을 이해하고 있는가?

---

## 테스트 가이드

### 단위 테스트 예시

```typescript
import { EncryptionTransformer } from '@/common/utils/encryption.transformer';

describe('EncryptionTransformer', () => {
  let transformer: EncryptionTransformer;
  const testKey = 'test-encryption-key-minimum-32-chars-long';

  beforeEach(() => {
    transformer = new EncryptionTransformer(testKey);
  });

  describe('암호화 및 복호화', () => {
    it('평문을 암호화하고 복호화하면 원본과 같아야 한다', () => {
      const plaintext = 'test@example.com';
      const encrypted = transformer.to(plaintext);
      const decrypted = transformer.from(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it('동일한 평문을 여러 번 암호화하면 다른 암호문이 생성되어야 한다', () => {
      const plaintext = 'test@example.com';
      const encrypted1 = transformer.to(plaintext);
      const encrypted2 = transformer.to(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('null 값은 null로 반환되어야 한다', () => {
      expect(transformer.to(null)).toBeNull();
      expect(transformer.from(null)).toBeNull();
    });

    it('빈 문자열은 null로 반환되어야 한다', () => {
      expect(transformer.to('')).toBeNull();
      expect(transformer.from('')).toBeNull();
    });
  });

  describe('키 검증', () => {
    it('32자 미만의 키는 에러를 발생시켜야 한다', () => {
      expect(() => {
        new EncryptionTransformer('short-key');
      }).toThrow();
    });

    it('빈 키는 에러를 발생시켜야 한다', () => {
      expect(() => {
        new EncryptionTransformer('');
      }).toThrow();
    });
  });
});
```

### 통합 테스트 예시

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { User } from './entities/user.entity';

describe('UserService - 암호화 통합 테스트', () => {
  let service: UserService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          username: 'test',
          password: 'test',
          database: 'test_db',
          entities: [User],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([User]),
      ],
      providers: [UserService],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterAll(async () => {
    await module.close();
  });

  it('사용자 생성 시 이메일이 암호화되어 저장되고 조회 시 복호화되어야 한다', async () => {
    const email = 'test@example.com';
    const username = 'testuser';

    const user = await service.createUser({
      email,
      username,
      providerType: ProviderType.KAKAO,
      providerId: '12345',
    });

    expect(user.email).toBe(email);
    expect(user.username).toBe(username);

    const foundUser = await service.findById(user.userId);
    expect(foundUser.email).toBe(email);
    expect(foundUser.username).toBe(username);
  });
});
```

---

## 문제 해결 가이드

### 1. "암호화 키가 설정되지 않았습니다" 에러

**원인:** `ENCRYPTION_KEY` 환경변수가 설정되지 않음

**해결:**
```bash
# .env 파일에 추가
ENCRYPTION_KEY=your_encryption_key_minimum_32_characters_required
```

### 2. "데이터 복호화에 실패했습니다" 에러

**원인:**
- 암호화 키가 변경됨
- 데이터 형식이 올바르지 않음
- 데이터베이스의 데이터가 손상됨

**해결:**
1. 암호화 키가 변경되지 않았는지 확인
2. 데이터베이스의 암호화된 데이터 형식 확인 (`iv:authTag:encryptedData`)
3. 필요한 경우 백업에서 데이터 복구

### 3. 성능 저하

**원인:** 대량의 데이터 조회 시 복호화 연산 부하

**해결:**
- 페이지네이션 적용
- 캐싱 전략 도입
- 필요한 필드만 선택적으로 조회

---

## 결론

본 가이드를 따라 구현하면 NestJS + TypeORM 환경에서 안전하게 민감정보를 암호화할 수 있습니다. 

핵심 원칙:
1. **자동화**: TypeORM ValueTransformer를 사용하여 투명한 암호화/복호화
2. **보안**: AES-256-GCM 알고리즘과 랜덤 IV로 강력한 보안 제공
3. **편의성**: 서비스 계층에서는 평문으로 작업 가능
4. **안전성**: 키 검증, 에러 처리, 로깅 시 민감정보 보호

암호화 키 관리와 검색 제약사항을 충분히 이해하고, 보안 체크리스트를 준수하세요.

