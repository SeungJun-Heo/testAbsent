# 빠른 시작 가이드

5분 안에 시작하는 휴가 현황 자동화!

## 중요: 로그인 방식

**이 프로그램은 자동으로 로그인하지 않습니다!**

- 브라우저에서 **미리 로그인**해두어야 합니다
- 프로그램이 로그인 상태를 확인하고 사용합니다
- 로그인 안 되어 있으면 10분마다 재확인 (최대 2시간)

상세 설명: [LOGIN_APPROACH.md](LOGIN_APPROACH.md)

## 1단계: 설치 (2분)

```bash
# 의존성 설치
npm install

# Playwright 브라우저 설치
npm run install-browsers
```

## 2단계: 설정 (1분)

### 환경 변수 파일 생성

```bash
cp .env.example .env
```

### `.env` 파일 편집

최소 필수 항목:

```env
# 회사 페이지 URL
COMPANY_LOGIN_URL=https://your-company.com
VACATION_PAGE_URL=https://your-company.com/vacation

# Confluence 페이지 URL
CONFLUENCE_PAGE_URL=https://your-confluence.atlassian.net/wiki/spaces/TEAM/pages/123/Team-Calendar

# 브라우저 설정 (화면 보면서 테스트하려면 false로)
HEADLESS=false
```

## 3단계: 로그인 상태 확인 설정 (선택사항)

### [src/modules/auth.js](src/modules/auth.js:40) 수정

로그인된 사용자만 볼 수 있는 요소를 찾아 추가하세요:

```javascript
// 로그인 확인을 위한 선택자들
const loggedInSelectors = [
  '.user-profile',        // ← 실제 선택자로 변경
  '.user-menu',
  '#user-name',
];
```

**선택자 찾는 방법:**
1. 회사 페이지에서 로그인
2. F12 (개발자 도구)
3. 로그인 후에만 보이는 요소 찾기 (예: 사용자 이름, 프로필 사진)
4. 선택자 복사하여 추가

## 4단계: 테스트 실행

### 먼저 브라우저에서 로그인!

```bash
# 브라우저가 열립니다
HEADLESS=false npm test
```

**브라우저가 열리면:**
1. 회사 시스템에 로그인
2. Confluence에 로그인
3. 프로그램이 자동으로 확인하고 진행

성공하면 데이터가 `data/vacation-current.json`에 저장됩니다!

## 다음 단계

### 휴가 데이터 파싱 수정

[src/modules/vacation.js](src/modules/vacation.js:59)에서 실제 웹페이지 구조에 맞게 수정:

```javascript
// 테이블 구조 확인 후 수정
const vacationData = await page.$$eval('.vacation-row', rows => {
  return rows.map(row => {
    return {
      employeeName: row.querySelector('.name')?.textContent?.trim() || '',
      // ... 실제 클래스명으로 변경
    };
  });
});
```

**도우미 도구:**
```bash
# 휴가 페이지 구조 분석
npm run analyze-page
```

### Confluence 연동 테스트

```bash
# Confluence 편집 테스트
npm run test-confluence

# 전체 테스트 (1회 실행)
npm run start -- --once
```

### 스케줄 설정

```bash
# 평일 오전 9시 자동 실행
npm start
```

## 문제 해결

### "로그인되지 않았습니다" 계속 나올 때

**원인:** 로그인 확인 선택자가 올바르지 않음

**해결:**
```bash
# 브라우저 보면서 확인
HEADLESS=false npm test

# F12로 개발자 도구 열기
# 로그인 후 보이는 요소 찾기
# src/modules/auth.js의 loggedInSelectors에 추가
```

또는 `.env`에서 직접 지정:
```env
LOGIN_INDICATOR_SELECTOR=.your-user-element
```

### 로그인 대기 시간 조정

```env
# 5분마다 확인, 최대 1시간 대기
LOGIN_CHECK_RETRY_INTERVAL=300000
LOGIN_CHECK_MAX_DURATION=3600000
```

### WSL에서 실행

```bash
# WSL에서 추가 의존성 설치
sudo apt-get update
sudo apt-get install -y libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
    libxrandr2 libgbm1 libasound2

# headless 모드 필수
HEADLESS=true
```

**WSL에서 로그인 문제:**
- 세션 저장 사용 (첫 실행은 Windows에서)
- 또는 로그인되어 있을 시간에만 스케줄 실행

## 유용한 명령어

```bash
# 테스트 (Confluence 업데이트 안 함)
npm test

# 1회 실행
npm run start -- --once

# 스케줄 모드
npm start

# Confluence 편집 테스트
npm run test-confluence

# 페이지 구조 분석
npm run analyze-page

# 백그라운드 실행 (Linux/WSL)
nohup npm start > automation.log 2>&1 &
```

## 더 자세한 정보

- **로그인 방식**: [LOGIN_APPROACH.md](LOGIN_APPROACH.md) ⭐ 필독!
- **전체 문서**: [README.md](README.md)
- **Selenium vs Playwright**: [PLAYWRIGHT_GUIDE.md](PLAYWRIGHT_GUIDE.md)
- **Confluence 방식**: [CONFLUENCE_PLAYWRIGHT.md](CONFLUENCE_PLAYWRIGHT.md)
