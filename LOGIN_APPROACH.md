# 로그인 방식 설명

이 프로젝트는 **자동 로그인을 수행하지 않습니다**. 대신 사용자가 미리 브라우저에 로그인한 상태를 확인하고 사용합니다.

## 왜 자동 로그인하지 않나요?

### 보안상의 이유
1. **비밀번호 저장 불필요** - .env 파일에 비밀번호를 저장할 필요가 없습니다
2. **SSO/2FA 지원** - 복잡한 인증 방식(SSO, 2단계 인증, OTP 등)도 문제없이 동작
3. **회사 보안 정책 준수** - 자동 로그인이 회사 보안 정책에 위배될 수 있음

### 실용적인 이유
1. **안정적** - 로그인 폼 변경에 영향받지 않음
2. **유연함** - 어떤 인증 방식이든 동작
3. **간단함** - 로그인 로직 구현 불필요

## 동작 방식

### 1. 로그인 상태 확인
프로그램은 다음 방법으로 로그인 여부를 확인합니다:

```javascript
// 방법 1: 로그인 폼 확인 (있으면 로그인 안 됨)
const loginForm = await page.$('form[name="loginForm"]');
if (loginForm) return false;

// 방법 2: 로그인된 사용자 요소 확인
const userProfile = await page.$('.user-profile');
if (userProfile) return true;

// 방법 3: URL 확인
if (page.url().includes('/login')) return false;

// 방법 4: 세션 쿠키 확인
const cookies = await page.context().cookies();
if (cookies.some(c => c.name.includes('session'))) return true;
```

### 2. 로그인되지 않은 경우
로그인되지 않았다면 프로그램은:

1. **10분 대기** (기본값, 설정 가능)
2. 다시 로그인 상태 확인
3. 여전히 로그인 안 되어 있으면 다시 대기
4. **2시간 동안** 반복 (기본값, 설정 가능)
5. 2시간 후에도 로그인 안 되어 있으면 **종료**

### 3. 타임라인 예시

```
09:00 - 프로그램 시작
09:00 - 로그인 확인: 로그인 안 됨
09:00 - "10분 후 다시 확인합니다. 브라우저에서 로그인해주세요."
09:10 - 로그인 확인: 로그인 안 됨
09:10 - "10분 후 다시 확인합니다..."
09:20 - 로그인 확인: 로그인됨! ✓
09:20 - 휴가 데이터 수집 시작
...
11:00 - (2시간 경과) 로그인 안 되어 있으면 종료
```

## 설정

### .env 파일

```env
# 재시도 간격 (밀리초)
LOGIN_CHECK_RETRY_INTERVAL=600000      # 10분 = 10 * 60 * 1000

# 최대 대기 시간 (밀리초)
LOGIN_CHECK_MAX_DURATION=7200000       # 2시간 = 2 * 60 * 60 * 1000

# 로그인 확인 선택자 (선택사항)
# 로그인된 사용자만 볼 수 있는 요소를 지정하면 더 정확합니다
LOGIN_INDICATOR_SELECTOR=.user-profile
```

### 시간 설정 예제

```env
# 5분마다 확인, 최대 1시간 대기
LOGIN_CHECK_RETRY_INTERVAL=300000      # 5분
LOGIN_CHECK_MAX_DURATION=3600000       # 1시간

# 30분마다 확인, 최대 4시간 대기
LOGIN_CHECK_RETRY_INTERVAL=1800000     # 30분
LOGIN_CHECK_MAX_DURATION=14400000      # 4시간
```

## 사용 방법

### 1. 브라우저에서 미리 로그인

프로그램 실행 전에:
1. Chrome 브라우저 열기
2. 회사 시스템에 로그인
3. Confluence에 로그인
4. 브라우저 창 그대로 유지

### 2. 프로그램 실행

```bash
# headless=false로 설정하여 브라우저 보기
HEADLESS=false npm start
```

브라우저가 보이면:
- 로그인되어 있으면: 자동으로 진행 ✓
- 로그인 안 되어 있으면: 직접 로그인 후 대기

### 3. 자동 재시도

로그인이 안 되어 있어도 괜찮습니다:
- 프로그램이 기다립니다
- 그동안 로그인하면 됩니다
- 로그인하면 자동으로 계속 진행됩니다

## Headless 모드에서는?

Headless 모드(HEADLESS=true)에서는 브라우저가 보이지 않습니다.

**해결 방법:**

### 방법 1: 세션 저장 사용
```javascript
// 첫 실행: headless=false로 로그인
HEADLESS=false npm start

// 로그인 후 세션 저장
await page.context().storageState({ path: './auth-state.json' });

// 다음 실행부터: 저장된 세션 로드
const context = await browser.newContext({
  storageState: './auth-state.json'
});
```

### 방법 2: 특정 시간에만 실행
스케줄러를 사용하여 로그인되어 있을 시간에만 실행:
```env
# 근무 시간에만 실행 (오전 9시, 오후 2시)
CRON_SCHEDULE=0 9,14 * * 1-5
```

### 방법 3: 사전에 로그인 확인
```bash
# 먼저 headless=false로 로그인 확인
HEADLESS=false npm test

# 로그인 확인 후 headless 모드로 실행
HEADLESS=true npm start
```

## Confluence 로그인

Confluence도 동일한 방식으로 동작합니다:
- 로그인 상태 확인
- 로그인 안 되어 있으면 60초 대기
- 사용자가 로그인할 시간 제공

## 로그인 상태 확인 커스터마이징

실제 회사 시스템에 맞게 수정하세요:

### [src/modules/auth.js](src/modules/auth.js:40)

```javascript
// 로그인된 사용자만 볼 수 있는 요소 선택자
const loggedInSelectors = [
  '.user-profile',        // 사용자 프로필
  '.user-menu',          // 사용자 메뉴
  '#user-name',          // 사용자 이름
  '.header-user',        // 헤더의 사용자 영역
  '.logged-in',          // 로그인 상태 표시
];
```

실제 웹사이트에 맞게 수정하세요:
1. F12로 개발자 도구 열기
2. 로그인 후에만 보이는 요소 찾기
3. 선택자를 배열에 추가

## 문제 해결

### Q: "로그인되지 않았습니다"라고 계속 나옵니다

**A:** 로그인 확인 선택자가 올바르지 않을 수 있습니다.

```bash
# 브라우저를 보면서 확인
HEADLESS=false npm test

# F12로 개발자 도구를 열어 로그인 후 보이는 요소 확인
# src/modules/auth.js의 loggedInSelectors 수정
```

### Q: 2시간은 너무 깁니다/짧습니다

**A:** .env 파일에서 조정하세요:

```env
# 1시간으로 변경
LOGIN_CHECK_MAX_DURATION=3600000

# 또는 30분으로 변경
LOGIN_CHECK_MAX_DURATION=1800000
```

### Q: 로그인 확인을 더 자주/덜 자주 하고 싶습니다

**A:** 재시도 간격을 조정하세요:

```env
# 5분마다 확인
LOGIN_CHECK_RETRY_INTERVAL=300000

# 30분마다 확인
LOGIN_CHECK_RETRY_INTERVAL=1800000
```

### Q: Headless 모드에서 로그인할 수 없습니다

**A:** 세 가지 방법이 있습니다:

1. **세션 저장 사용** (권장)
2. **로그인되어 있을 시간에만 실행**
3. **Headless 모드 사용 안 함**

## 장점 요약

✅ **더 안전** - 비밀번호 저장 불필요
✅ **더 유연** - 모든 인증 방식 지원
✅ **더 안정적** - 로그인 폼 변경에 영향 없음
✅ **회사 정책 준수** - 자동 로그인 금지 정책 대응
✅ **SSO/2FA 지원** - 복잡한 인증도 문제없음

## 참고 자료

- [src/modules/auth.js](src/modules/auth.js) - 로그인 확인 로직
- [src/index.js](src/index.js) - 메인 자동화 로직
- [.env.example](.env.example) - 설정 예제
