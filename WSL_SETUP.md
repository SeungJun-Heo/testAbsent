# WSL 환경 설정 가이드

WSL(Windows Subsystem for Linux)에서 이 프로젝트를 실행하는 방법을 설명합니다.

## 문제: WSL에서 로그인 불가

WSL에서 설치한 Chrome 브라우저로는 회사 로그인이 안 되는 경우가 많습니다.

**원인:**
- SSO/OAuth 인증 문제
- 브라우저 쿠키/세션 제한
- 회사 보안 정책

## 해결 방법

### 방법 1: Windows Chrome 세션 활용 (권장)

WSL과 Windows의 Chrome을 연결하여 사용합니다.

#### 1-1. Chrome User Data 공유

```bash
# WSL에서 Windows Chrome 프로필 경로 사용
```

`.env` 파일 수정:
```env
# Windows Chrome 사용자 데이터 경로
CHROME_USER_DATA_DIR=/mnt/c/Users/YourUsername/AppData/Local/Google/Chrome/User Data
CHROME_PROFILE=Default
```

[src/index.js](src/index.js:54) 수정:
```javascript
// 브라우저 컨텍스트 생성 시 Windows Chrome 세션 사용
context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  // Windows Chrome 사용자 데이터 사용
  ...(process.env.CHROME_USER_DATA_DIR && {
    userDataDir: process.env.CHROME_USER_DATA_DIR,
    channel: 'chrome',
  }),
});
```

**장점:**
- Windows에서 한 번 로그인하면 WSL에서도 사용 가능
- 세션 유지가 용이

**단점:**
- Chrome이 동시에 실행 중이면 충돌 가능
- 경로 설정이 필요

#### 1-2. 세션 저장/복원 방식

Windows에서 한 번 로그인하고 세션을 저장한 후 WSL에서 사용합니다.

**Windows PowerShell에서 실행:**
```powershell
# 1. Windows에서 headless=false로 실행하여 로그인
$env:HEADLESS="false"
npm test

# 세션이 auth-state.json에 자동 저장됨
```

**WSL에서 auth-state.json 사용:**

[src/index.js](src/index.js:54) 수정:
```javascript
// 저장된 세션 파일이 있으면 로드
let storageState = undefined;
try {
  if (await fs.access('./auth-state.json').then(() => true).catch(() => false)) {
    storageState = './auth-state.json';
    console.log('저장된 로그인 세션 로드 중...');
  }
} catch (e) {}

context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  storageState, // 저장된 세션 사용
});
```

로그인 성공 후 세션 저장 ([src/modules/auth.js](src/modules/auth.js) 수정):
```javascript
export async function waitForLogin(page) {
  // ... 로그인 확인 로직 ...

  if (isLoggedIn) {
    console.log('✓ 로그인 확인됨!');

    // 세션 저장
    try {
      await page.context().storageState({ path: './auth-state.json' });
      console.log('로그인 세션 저장됨: auth-state.json');
    } catch (e) {
      console.log('세션 저장 실패 (무시 가능)');
    }

    return true;
  }
}
```

**사용 방법:**
```bash
# Windows에서 최초 1회 실행 (로그인)
# PowerShell에서:
$env:HEADLESS="false"
npm run start -- --once

# WSL에서 실행 (저장된 세션 사용)
npm start
```

### 방법 2: Remote Browser 사용

Windows에서 Chrome을 Remote Debugging 모드로 실행하고 WSL에서 연결합니다.

#### Windows에서 Chrome 실행 (PowerShell):
```powershell
# Chrome을 remote debugging 모드로 실행
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --remote-debugging-port=9222 `
  --user-data-dir="C:\chrome-debug-profile"
```

#### WSL에서 연결:

`.env`에 추가:
```env
CHROME_REMOTE_DEBUGGING_URL=http://localhost:9222
```

[src/index.js](src/index.js:49) 수정:
```javascript
let browser;

if (process.env.CHROME_REMOTE_DEBUGGING_URL) {
  // Remote Chrome에 연결
  browser = await chromium.connectOverCDP(process.env.CHROME_REMOTE_DEBUGGING_URL);
  console.log('Windows Chrome에 연결됨');
} else {
  // 로컬 브라우저 실행
  browser = await chromium.launch({
    headless: process.env.HEADLESS === 'true',
    slowMo: 100,
  });
}
```

**장점:**
- Windows Chrome을 그대로 사용
- 로그인 문제 없음
- 세션 유지 완벽

**단점:**
- Windows에서 Chrome을 먼저 실행해야 함
- 설정이 복잡함

### 방법 3: Windows에서 실행 (가장 간단)

WSL 대신 Windows에서 직접 실행합니다.

**Windows PowerShell에서:**
```powershell
# Node.js 설치 (Windows용)
# https://nodejs.org 에서 다운로드

# 프로젝트 폴더로 이동
cd C:\Users\YourUsername\path\to\testAbsent

# 설치 및 실행
npm install
npm run install-browsers
npm start
```

**장점:**
- 가장 간단함
- 로그인 문제 없음
- GUI 사용 가능

**단점:**
- WSL의 리눅스 도구 사용 불가

### 방법 4: 로그인 시간에만 실행

로그인되어 있을 시간에만 스케줄 실행합니다.

```bash
# Windows에서 아침에 로그인
# WSL에서 근무 시간에만 실행

# .env 설정
CRON_SCHEDULE=0 9,14,17 * * 1-5  # 오전 9시, 오후 2시, 5시
```

Windows에서 수동으로 로그인해두면 WSL에서 스케줄 실행 시 세션을 사용합니다.

## 추천 방법

### 개발/테스트 단계
**방법 3 (Windows에서 실행)** - 가장 간단하고 문제 없음

### 프로덕션/자동화
**방법 1-2 (세션 저장/복원)** - 한 번만 Windows에서 로그인, 이후 WSL에서 자동 실행

## 구현 예제: 세션 저장/복원

가장 실용적인 방법인 세션 저장/복원을 구현한 예제입니다.

### 1. .env 설정
```env
# 세션 저장 활성화
USE_SAVED_SESSION=true
SESSION_FILE=./auth-state.json
```

### 2. index.js 수정

```javascript
// 세션 저장/복원 로직 추가
async function createBrowserContext(browser) {
  const useSavedSession = process.env.USE_SAVED_SESSION === 'true';
  const sessionFile = process.env.SESSION_FILE || './auth-state.json';

  let storageState = undefined;

  if (useSavedSession) {
    try {
      await fs.access(sessionFile);
      storageState = sessionFile;
      console.log(`✓ 저장된 세션 로드: ${sessionFile}`);
    } catch (e) {
      console.log('저장된 세션 없음. 새로 로그인이 필요합니다.');
    }
  }

  return await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    storageState,
  });
}

// 사용
context = await createBrowserContext(browser);
```

### 3. auth.js에 세션 저장 추가

```javascript
export async function waitForLogin(page) {
  // ... 기존 로직 ...

  if (isLoggedIn) {
    console.log('✓ 로그인 확인됨!');

    // 세션 저장
    if (process.env.USE_SAVED_SESSION === 'true') {
      try {
        const sessionFile = process.env.SESSION_FILE || './auth-state.json';
        await page.context().storageState({ path: sessionFile });
        console.log(`✓ 세션 저장: ${sessionFile}`);
      } catch (e) {
        console.log('⚠️  세션 저장 실패:', e.message);
      }
    }

    return true;
  }
}
```

### 4. 사용 방법

```bash
# Windows에서 최초 1회 실행
# PowerShell:
$env:HEADLESS="false"
$env:USE_SAVED_SESSION="true"
npm run start -- --once

# auth-state.json 파일이 생성됨

# WSL로 파일 복사
# PowerShell:
Copy-Item auth-state.json \\wsl$\Ubuntu\home\username\testAbsent\

# WSL에서 실행 (저장된 세션 사용)
npm start
```

## 자동화된 워크플로우

### 일일 워크플로우

```bash
#!/bin/bash
# daily-workflow.sh

# 1. 세션 파일 확인
if [ ! -f "./auth-state.json" ]; then
  echo "❌ 세션 파일 없음. Windows에서 로그인 필요"
  echo "Windows PowerShell에서 다음 실행:"
  echo '  $env:HEADLESS="false"'
  echo '  npm run start -- --once'
  exit 1
fi

# 2. 세션 유효성 확인 (간단한 테스트)
echo "세션 유효성 확인 중..."
timeout 30s npm test > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo "✓ 세션 유효. 자동화 실행"
  npm start
else
  echo "❌ 세션 만료. Windows에서 재로그인 필요"
  rm -f ./auth-state.json
  exit 1
fi
```

### cron 설정

```bash
# crontab -e
# 평일 오전 9시 실행
0 9 * * 1-5 cd /home/username/testAbsent && ./daily-workflow.sh >> /var/log/vacation-automation.log 2>&1
```

## .gitignore에 세션 파일 추가

```bash
# .gitignore에 추가
echo "auth-state.json" >> .gitignore
echo "chrome-debug-profile/" >> .gitignore
```

## 보안 고려사항

### 세션 파일 보호
```bash
# 세션 파일 권한 제한
chmod 600 auth-state.json

# 소유자만 읽기/쓰기 가능
ls -la auth-state.json
# -rw------- 1 user user ... auth-state.json
```

### 정기적인 세션 갱신
```bash
# 주 1회 세션 갱신 (월요일 오전 8시)
# crontab -e
0 8 * * 1 rm -f /home/username/testAbsent/auth-state.json
```

월요일 오전 8시에 세션 파일을 삭제하면, 9시 실행 시 로그인이 필요하다고 알림이 가고, Windows에서 재로그인하면 됩니다.

## 문제 해결

### Q: 세션이 자꾸 만료됩니다
**A:** 회사 정책상 세션 유효기간이 짧을 수 있습니다.
- 더 자주 갱신 (매일 아침)
- 또는 Remote Browser 방식 사용

### Q: auth-state.json이 생성되지 않습니다
**A:** 세션 저장 로직 확인
```bash
# 수동으로 저장 테스트
HEADLESS=false USE_SAVED_SESSION=true npm test
```

### Q: WSL에서 Windows 파일에 접근할 수 없습니다
**A:** WSL2는 `/mnt/c/`를 통해 Windows 파일에 접근 가능
```bash
ls /mnt/c/Users/YourUsername/
```

## 참고 자료

- [Playwright Authentication](https://playwright.dev/docs/auth)
- [WSL2 Windows 파일 접근](https://docs.microsoft.com/en-us/windows/wsl/filesystems)
- [Chrome Remote Debugging](https://chromedevtools.github.io/devtools-protocol/)
