# Passport.js와 전략 패턴(Strategy Pattern) in NestJS

이 문서는 우리 프로젝트에서 Passport.js가 어떻게 동작하고, 이것이 전략 패턴과 어떤 관련이 있는지 설명합니다.

## 1. 전략 패턴 (Strategy Pattern)이란?

전략 패턴은 객체 지향 디자인 패턴 중 하나로, 특정 계열의 알고리즘들을 정의하고 각 알고리즘을 캡슐화하여 이들을 상호 교체 가능하게 만듭니다. 전략 패턴을 사용하면 클라이언트로부터 알고리즘을 분리하여 독립적으로 변경할 수 있습니다.

쉽게 말해, 여러 가지 방법(전략)이 있을 때, 이 방법들을 각각의 부품처럼 만들어 놓고 필요할 때마다 갈아 끼울 수 있도록 하는 설계 방식입니다.

## 2. Passport.js: 인증을 위한 전략 패턴의 구현체

Passport.js는 Node.js를 위한 인증 미들웨어이며, NestJS에서 널리 사용됩니다. Passport.js의 핵심은 **전략(Strategy)** 입니다.

- **다양한 인증 전략**: Passport는 여러 종류의 인증 방식을 '전략'으로 제공합니다. 예를 들어, 카카오 로그인, JWT 토큰 인증, 사용자 이름/비밀번호 인증 등 각각이 하나의 전략이 됩니다.
- **모듈성 및 유연성**: 새로운 인증 방식을 추가하고 싶을 때, 해당 방식에 맞는 전략만 구현하여 추가하면 되므로 기존 코드에 미치는 영향을 최소화할 수 있습니다. 이는 전략 패턴의 가장 큰 장점 중 하나입니다.

우리 프로젝트에서는 `passport-kakao`와 `passport-jwt`를 사용하여 각각 카카오 소셜 로그인과 JWT 기반 인증을 처리하고 있습니다.

## 3. 프로젝트 내 인증 흐름

우리 프로젝트의 인증 흐름은 다음과 같은 단계로 이루어집니다.

### 단계 1: `@UseGuards` 데코레이터로 인증 시작

컨트롤러의 특정 엔드포인트에 `@UseGuards(AuthGuard('...'))` 데코레이터를 사용하여 인증을 시작합니다. `AuthGuard`에 전달되는 문자열 인자(`'kakao'`, `'jwt'`)가 바로 사용할 **전략의 이름**입니다.

**예시: `src/modules/auth/controllers/auth.controller.ts`**
```typescript
@Get('kakao')
@UseGuards(AuthGuard('kakao')) // 'kakao' 전략을 사용하라고 지정
kakaoLogin() {
  // 이 엔드포인트는 카카오 로그인 흐름을 시작합니다.
}

@Get('kakao/callback')
@UseGuards(AuthGuard('kakao')) // 카카오 로그인 후 콜백 처리 시에도 'kakao' 전략 사용
async kakaoLoginCallback(@Req() req: RequestWithUser, @Res() res: Response) {
  // ...
}
```

### 단계 2: 전략(Strategy)의 `validate` 메소드 실행

`AuthGuard`는 지정된 이름의 전략을 찾아 해당 전략의 `validate` 메소드를 실행합니다.

#### 카카오 로그인: `KakaoStrategy`

- `KakaoStrategy`의 `validate` 메소드는 카카오로부터 받은 `accessToken`, `refreshToken`, 그리고 사용자 `profile` 정보를 인자로 받습니다.
- 이 정보를 바탕으로 `AuthService`의 `validateAndSaveUser` 메소드를 호출하여 우리 서비스의 데이터베이스에서 사용자를 찾거나 새로 생성합니다.

**예시: `src/modules/auth/strategies/kakao.strategy.ts`**
```typescript
async validate(accessToken: string, refreshToken: string, profile: any, done: any) {
  const { id, username, _json } = profile;
  const email = _json?.kakao_account?.email;
  // ...

  // 사용자 정보를 DB에서 확인하고 저장하는 로직 호출
  const user = await this.authService.validateAndSaveUser(
    'kakao',
    id.toString(),
    newUsername,
    email,
    // ...,
    accessToken,
    refreshToken,
  );

  done(null, user); // user 객체를 반환
}
```

#### JWT 인증: `JwtStrategy`

- `JwtStrategy`의 `validate` 메소드는 클라이언트가 보낸 JWT 토큰을 복호화한 `payload`를 인자로 받습니다.
- `payload`에 담긴 정보(예: 사용자 ID, 사용자 이름)를 바탕으로 요청을 인증할 사용자를 결정합니다.

**예시: `src/modules/auth/strategies/jwt.strategy.ts`**
```typescript
async validate(payload: any) {
  // payload에는 login 시에 넣었던 정보가 담겨 있습니다.
  return { id: payload.sub, username: payload.username };
}
```

### 단계 3: 사용자 객체(User Object) 주입

`validate` 메소드가 성공적으로 `user` 객체를 반환하면, Passport는 이 객체를 `Request` 객체에 `user`라는 이름의 프로퍼티로 주입합니다. (예: `req.user`)

### 단계 4: 컨트롤러에서 인증된 사용자 정보 사용

컨트롤러 메소드에서 `@Req()` 데코레이터를 사용하여 `Request` 객체에 접근하고, `req.user`를 통해 인증된 사용자의 정보를 사용할 수 있습니다.

**예시: `src/modules/auth/controllers/auth.controller.ts`**
```typescript
@Get('kakao/callback')
@UseGuards(AuthGuard('kakao'))
async kakaoLoginCallback(@Req() req: RequestWithUser, @Res() res: Response) {
  const { user } = req; // req.user에 주입된 사용자 정보
  const token = await this.authService.login(user); // 이 정보를 바탕으로 우리 서비스의 JWT 토큰 발급
  // ...
}
```

## 4. 결론

Passport.js와 전략 패턴을 사용함으로써 우리 프로젝트는 다음과 같은 이점을 얻습니다.

- **관심사의 분리**: 인증 로직이 각 전략 클래스로 분리되어 컨트롤러와 서비스 로직이 깔끔하게 유지됩니다.
- **확장성**: 구글, 네이버 등 다른 소셜 로그인을 추가하고 싶을 때, 해당 전략만 새로 구현하여 `AuthModule`에 추가하면 되므로 확장이 매우 용이합니다.
- **재사용성**: 한번 만들어진 인증 전략은 여러 엔드포인트에서 `@UseGuards`를 통해 재사용될 수 있습니다.

이처럼 Passport.js는 전략 패턴을 효과적으로 활용하여 NestJS 애플리케이션에서 유연하고 확장 가능한 인증 시스템을 구축할 수 있도록 돕습니다.
