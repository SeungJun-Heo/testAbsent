# 빠른 시작 가이드

5분 안에 시작하는 휴가 현황 자동화!

## 1단계: 설치 (2분)

```bash
# 의존성 설치
npm install

# Playwright 브라우저 설치
npm run install-browsers
```

## 2단계: 설정 (2분)

### 환경 변수 파일 생성

```bash
cp .env.example .env
```

### `.env` 파일 편집

최소한 다음 항목만 설정하면 테스트 가능:

```env
# 회사 로그인 정보
COMPANY_LOGIN_URL=https://your-company.com/login
COMPANY_USERNAME=your-id
COMPANY_PASSWORD=your-password

# 휴가 페이지
VACATION_PAGE_URL=https://your-company.com/vacation

# 브라우저 설정 (화면 보면서 테스트하려면 false로)
HEADLESS=false
```

Confluence 설정은 나중에 해도 됩니다!

## 3단계: 코드 수정 (1분)

### 실제 웹사이트 선택자 확인

1. Chrome에서 회사 로그인 페이지 열기
2. F12 누르기 (개발자 도구)
3. 요소 선택 도구(🔍) 클릭
4. 사용자명 입력란 클릭
5. 하단 HTML 태그 확인:
   - `<input id="username">` → `#username`
   - `<input name="user">` → `input[name="user"]`

### [src/modules/auth.js](src/modules/auth.js) 수정

```javascript
// 20번째 줄 근처: 실제 선택자로 변경
await page.fill('input[name="username"]', process.env.COMPANY_USERNAME); // ← 여기 수정
await page.fill('input[name="password"]', process.env.COMPANY_PASSWORD); // ← 여기 수정
await page.click('button[type="submit"]'); // ← 여기 수정
```

## 4단계: 테스트 실행

```bash
# 브라우저 화면 보면서 테스트
npm test
```

성공하면 데이터가 `data/vacation-current.json`에 저장됩니다!

## 다음 단계

### 휴가 데이터 파싱 수정

[src/modules/vacation.js](src/modules/vacation.js)에서 실제 웹페이지 구조에 맞게 수정:

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

### Confluence 연동

**API 토큰 불필요!** 일반 계정만 있으면 됩니다.

1. `.env`에 Confluence 정보 추가:
   ```env
   CONFLUENCE_PAGE_URL=https://your-confluence.atlassian.net/wiki/spaces/TEAM/pages/123456789/Team+Calendar
   CONFLUENCE_USERNAME=your-email@company.com
   CONFLUENCE_PASSWORD=your-password
   ```

2. Confluence 편집 테스트:
   ```bash
   npm run test-confluence
   ```

3. 전체 테스트:
   ```bash
   npm run start -- --once
   ```

### 스케줄 설정

```bash
# 평일 오전 9시 자동 실행
npm start
```

## 문제 해결

### 요소를 찾을 수 없다고 나올 때

```bash
# 화면 보면서 확인
# .env에서 HEADLESS=false로 설정 후
npm test
```

브라우저가 열리면서 어디서 멈추는지 확인할 수 있습니다.

### 로그인이 안 될 때

1. 선택자가 맞는지 확인 (F12로 확인)
2. 캡차가 있는지 확인
3. 2단계 인증이 있는지 확인

### WSL에서 실행하려면

```bash
# WSL에서 추가 의존성 설치
sudo apt-get update
sudo apt-get install -y libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2

# .env에서 반드시 headless 모드 설정
HEADLESS=true
```

## 유용한 명령어

```bash
# 테스트 (Confluence 업데이트 안 함)
npm test

# 1회만 실행
npm run start -- --once

# 스케줄 모드
npm start

# 백그라운드 실행 (Linux/WSL)
nohup npm start > automation.log 2>&1 &
```

## 더 자세한 정보

- 전체 문서: [README.md](README.md)
- Selenium vs Playwright: [README.md#selenium-vs-playwright](README.md#selenium-vs-playwright)
- 문제 해결: [README.md#문제-해결](README.md#문제-해결)
