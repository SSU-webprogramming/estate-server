# 인증 플로우 - Kakao OAuth 및 JWT

## 개요

이 문서는 Estate Server의 인증 시스템 동작 방식을 설명합니다. Kakao OAuth 2.0을 통한 소셜 로그인과 JWT 기반 세션 관리를 사용합니다.

## 전체 인증 플로우 다이어그램

```mermaid
sequenceDiagram
    participant User as 사용자 (클라이언트)
    participant Server as NestJS 서버
    participant Kakao as 카카오 서버
    participant Redis as Redis
    participant DB as PostgreSQL

    Note over User, Kakao: 1. 카카오 로그인 시작
    User->>+Server: GET /auth/kakao
    Server-->>-User: 카카오 로그인 페이지로 리다이렉트

    Note over User, Kakao: 2. 카카오 인증
    User->>+Kakao: 카카오 아이디/비밀번호 입력
    Kakao-->>-User: 인증 완료 후 콜백 URL로 리다이렉트

    Note over User, DB: 3. 콜백 처리 및 토큰 발급
    User->>+Server: GET /auth/kakao/callback?code=AUTH_CODE
    Server->>+Kakao: 인가 코드로 Access Token 요청
    Kakao-->>-Server: Access Token 응답
    Server->>+Kakao: Access Token으로 사용자 정보 요청
    Kakao-->>-Server: 사용자 프로필 (이메일, 이름 등)
    
    Note over Server, DB: 4. 사용자 처리
    Server->>+DB: providerId로 사용자 조회
    alt 신규 사용자
        DB-->>-Server: null
        Server->>+DB: 새 사용자 생성
        DB-->>-Server: 생성된 사용자
    else 기존 사용자
        DB-->>-Server: 기존 사용자
    end
    
    Note over Server, Redis: 5. JWT 발급 및 저장
    Server->>Server: Access Token 생성 (1시간)
    Server->>Server: Refresh Token 생성 (7일)
    Server->>+Redis: Refresh Token 저장 (TTL 7일)
    Redis-->>-Server: 저장 완료
    Server-->>-User: JWT 응답 (access_token, refresh_token)

    Note over User, Server: 6. JWT를 이용한 API 접근
    User->>+Server: POST /estate-analysis (Authorization: Bearer access_token)
    Server->>Server: JwtStrategy로 토큰 검증
    Server->>Server: payload에서 사용자 정보 추출
    Server->>Server: 비즈니스 로직 실행
    Server-->>-User: API 응답

    Note over User, Redis: 7. Access Token 갱신
    User->>+Server: POST /auth/refresh (Authorization: Bearer refresh_token)
    Server->>+Redis: Refresh Token 검증
    Redis-->>-Server: 토큰 유효성 확인
    Server->>Server: 새 Access Token 생성
    Server-->>-User: 새 Access Token 응답

    Note over User, Redis: 8. 로그아웃
    User->>+Server: POST /auth/logout (Authorization: Bearer access_token)
    Server->>+Redis: Refresh Token 삭제
    Redis-->>-Server: 삭제 완료
    Server-->>-User: 로그아웃 성공
```

## 주요 컴포넌트

### 1. Kakao OAuth Strategy

**파일**: `src/modules/auth/strategies/kakao.strategy.ts`

**역할**:
- 카카오 OAuth 2.0 인증 처리
- 카카오에서 받은 사용자 정보로 회원가입/로그인 처리

**동작 흐름**:
1. `GET /auth/kakao` 요청 시 카카오 로그인 페이지로 리다이렉트
2. 카카오 인증 후 `/auth/kakao/callback`으로 돌아옴
3. `validate()` 메서드가 자동 호출됨
4. `AuthService.validateAndSaveUser()`로 사용자 저장/조회
5. `req.user`에 사용자 객체 주입

### 2. JWT Strategy

**파일**: `src/modules/auth/strategies/jwt.strategy.ts`

**역할**:
- JWT Access Token 검증
- Authorization 헤더에서 토큰 추출 및 검증

**동작 흐름**:
1. `Authorization: Bearer {token}` 헤더에서 토큰 추출
2. JWT 서명 검증 (JWT_SECRET 사용)
3. `validate()` 메서드로 payload 검증
4. `req.user`에 사용자 정보 주입

### 3. AuthService

**파일**: `src/modules/auth/services/auth.service.ts`

**주요 메서드**:

#### `validateAndSaveUser()`
- 카카오에서 받은 정보로 사용자 조회 또는 생성
- providerId(카카오 ID)로 기존 사용자 확인
- 신규 사용자 시 User 엔티티 생성 및 저장

#### `login()`
- Access Token (1시간) 생성
- Refresh Token (7일) 생성
- Refresh Token을 Redis에 저장 (TTL 7일)

#### `refresh()`
- Refresh Token 검증
- 새로운 Access Token 발급

#### `logout()`
- Redis에서 Refresh Token 삭제

### 4. AuthGuard

**파일**: `src/modules/auth/guards/`

#### KakaoAuthGuard
```typescript
@UseGuards(KakaoAuthGuard)
```
- 카카오 OAuth 인증이 필요한 엔드포인트에 적용
- 자동으로 KakaoStrategy 실행

#### JwtAuthGuard
```typescript
@UseGuards(JwtAuthGuard)
```
- JWT 인증이 필요한 엔드포인트에 적용
- 자동으로 JwtStrategy 실행

#### RolesGuard
```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
```
- 역할 기반 접근 제어 (RBAC)
- JwtAuthGuard와 함께 사용
- `@Roles()` 데코레이터로 필요 권한 지정

## 토큰 관리

### Access Token
- **유효기간**: 1시간
- **저장 위치**: 클라이언트 메모리 (localStorage 비권장)
- **용도**: API 요청 시 Authorization 헤더에 포함
- **갱신**: Refresh Token으로 갱신

### Refresh Token
- **유효기간**: 7일
- **저장 위치**: 
  - 서버: Redis (TTL 7일)
  - 클라이언트: HttpOnly Cookie 권장
- **용도**: Access Token 갱신
- **보안**: XSS 공격 방어를 위해 HttpOnly Cookie 사용 권장

## API 엔드포인트

### 인증 관련

#### `GET /auth/kakao`
- **설명**: 카카오 로그인 시작
- **인증**: 불필요
- **응답**: 카카오 로그인 페이지로 리다이렉트

#### `GET /auth/kakao/callback`
- **설명**: 카카오 로그인 콜백 처리
- **인증**: KakaoAuthGuard (자동)
- **응답**: 
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

#### `POST /auth/refresh`
- **설명**: Access Token 갱신
- **요청 헤더**: `Authorization: Bearer {refresh_token}`
- **응답**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

#### `POST /auth/logout`
- **설명**: 로그아웃 (Refresh Token 삭제)
- **요청 헤더**: `Authorization: Bearer {access_token}`
- **응답**:
  ```json
  {
    "message": "로그아웃 성공"
  }
  ```

### 보호된 API 사용 예시

```typescript
// Controller
@Get('profile')
@UseGuards(JwtAuthGuard)
async getProfile(@GetUser() user: User) {
  return user;
}

// Client Request
fetch('http://localhost:3000/users/profile', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
})
```

## 보안 고려사항

### 1. JWT Secret 관리
- 환경변수로 관리 (`.env` 파일)
- 최소 32자 이상의 안전한 랜덤 문자열 사용
- 개발/운영 환경별 다른 시크릿 사용

### 2. Refresh Token 보안
- Redis에 저장하여 서버 측에서 관리
- TTL 설정으로 자동 만료
- 로그아웃 시 명시적 삭제

### 3. HTTPS 사용
- 운영 환경에서는 반드시 HTTPS 사용
- 토큰 탈취 방지

### 4. CORS 설정
- 허용된 도메인만 API 접근 가능
- Credentials 허용 시 와일드카드(*) 사용 금지

## 디버깅 팁

### 토큰 확인
JWT 토큰의 내용을 확인하려면 [jwt.io](https://jwt.io)에서 디코딩할 수 있습니다.

### 로그 확인
```bash
# 인증 관련 로그 필터링
grep "Auth" logs/$(date +%Y-%m-%d).log
```

### Redis 토큰 확인
```bash
# Redis CLI 접속
docker exec -it redis redis-cli

# Refresh Token 조회
KEYS refresh_token:*
GET refresh_token:{userId}
```

## 트러블슈팅

### 문제: "Unauthorized" 에러
**원인**: Access Token 만료 또는 유효하지 않음  
**해결**: Refresh Token으로 새 Access Token 발급

### 문제: Refresh Token 갱신 실패
**원인**: Refresh Token이 Redis에서 삭제되었거나 만료됨  
**해결**: 다시 로그인 필요

### 문제: 카카오 로그인 실패
**원인**: 
- 잘못된 KAKAO_CLIENT_ID 또는 KAKAO_CLIENT_SECRET
- 카카오 개발자 콘솔에서 Redirect URI 미등록

**해결**: 
- 환경변수 확인
- 카카오 개발자 콘솔에서 `http://localhost:3000/auth/kakao/callback` 등록

## 참고 자료

- [NestJS Passport 공식 문서](https://docs.nestjs.com/security/authentication)
- [Kakao OAuth 공식 문서](https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api)
- [JWT 공식 사이트](https://jwt.io)
- [프로젝트 내부 문서: Passport와 전략 패턴](./passport-and-strategy-pattern.md)
