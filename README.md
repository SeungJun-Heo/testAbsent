# 팀원 휴가 현황 자동화 시스템

Playwright를 사용하여 회사 시스템의 팀원 휴가 현황을 자동으로 수집하고 Confluence 페이지에 업데이트하는 자동화 도구입니다.

## 목차

- [주요 기능](#주요-기능)
- [Selenium vs Playwright](#selenium-vs-playwright)
- [시스템 요구사항](#시스템-요구사항)
- [설치 방법](#설치-방법)
- [설정](#설정)
- [사용 방법](#사용-방법)
- [WSL 환경 설정](#wsl-환경-설정)
- [프로젝트 구조](#프로젝트-구조)
- [문제 해결](#문제-해결)

## 주요 기능

- 회사 시스템 자동 로그인 및 세션 관리
- 휴가 현황 페이지 자동 탐색 및 데이터 수집
- JSON 형식으로 데이터 저장 및 히스토리 관리
- 변경사항 자동 감지 (신규/변경/삭제)
- Confluence Team Calendar 자동 업데이트
- 스케줄 실행 지원 (cron)
- 오류 발생 시 스크린샷 자동 저장

## Selenium vs Playwright

Selenium을 사용해보셨다면 다음과 같은 차이점이 있습니다:

### 주요 차이점

| 기능 | Selenium | Playwright |
|------|----------|------------|
| **요소 찾기** | `driver.find_element(By.ID, "id")` | `page.locator('#id')` 또는 `page.$('#id')` |
| **클릭** | `element.click()` | `page.click('selector')` |
| **텍스트 입력** | `element.send_keys("text")` | `page.fill('selector', 'text')` |
| **대기** | `WebDriverWait` + `expected_conditions` | `page.waitForSelector()` (자동 대기 내장) |
| **페이지 이동** | `driver.get(url)` | `page.goto(url)` |
| **속도** | 상대적으로 느림 | 훨씬 빠름 |
| **자동 대기** | 수동 설정 필요 | 자동 내장 (Auto-waiting) |
| **멀티 브라우저** | 각각 설정 필요 | 통합 API로 쉽게 전환 |

### Playwright의 장점

1. **자동 대기 (Auto-waiting)**: 요소가 준비될 때까지 자동으로 대기
2. **빠른 속도**: Selenium보다 훨씬 빠른 실행 속도
3. **간단한 API**: 더 직관적이고 간결한 코드
4. **네트워크 제어**: 네트워크 요청/응답 가로채기 가능
5. **모던 웹 지원**: SPA, Shadow DOM 등 최신 기술 완벽 지원
6. **멀티 브라우저**: Chromium, Firefox, WebKit 모두 지원

### 코드 비교 예제

```python
# Selenium 코드
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

driver = webdriver.Chrome()
driver.get("https://example.com")

# 요소가 나타날 때까지 명시적으로 대기
wait = WebDriverWait(driver, 10)
element = wait.until(EC.presence_of_element_located((By.ID, "username")))
element.send_keys("myusername")

driver.find_element(By.ID, "password").send_keys("mypassword")
driver.find_element(By.CSS_SELECTOR, "button[type='submit']").click()
```

```javascript
// Playwright 코드 (본 프로젝트)
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('https://example.com');

// 자동으로 요소가 준비될 때까지 대기
await page.fill('#username', 'myusername');
await page.fill('#password', 'mypassword');
await page.click('button[type="submit"]');
```

## 시스템 요구사항

- Node.js 18.x 이상
- npm 또는 yarn
- Windows 10/11 또는 Linux (WSL2 포함)
- 최소 2GB 여유 디스크 공간 (브라우저 설치용)

## 설치 방법

### 1. 프로젝트 클론 또는 다운로드

```bash
cd /path/to/your/project
```

### 2. 의존성 설치

```bash
npm install
```

### 3. Playwright 브라우저 설치

```bash
npm run install-browsers
```

이 명령어는 Chromium 브라우저를 자동으로 다운로드하고 설치합니다.

### 4. 환경 변수 설정

`.env.example` 파일을 복사하여 `.env` 파일을 생성합니다:

```bash
cp .env.example .env
```

그리고 `.env` 파일을 열어 실제 정보로 수정합니다:

```env
# 회사 로그인 정보
COMPANY_LOGIN_URL=https://your-company-login.com
COMPANY_USERNAME=your-username
COMPANY_PASSWORD=your-password

# 휴가 현황 페이지 정보
VACATION_PAGE_URL=https://your-company-vacation-page.com

# Confluence 설정 (Playwright로 직접 편집)
CONFLUENCE_PAGE_URL=https://your-confluence.atlassian.net/wiki/spaces/TEAM/pages/123456789/Team+Calendar
CONFLUENCE_USERNAME=your-confluence-email@company.com
CONFLUENCE_PASSWORD=your-confluence-password
CONFLUENCE_LOGIN_URL=https://your-confluence.atlassian.net/login

# 스케줄 설정 (cron 형식)
CRON_SCHEDULE=0 9 * * 1-5

# 브라우저 설정
HEADLESS=true
BROWSER_TIMEOUT=30000

# 데이터 저장 경로
DATA_DIR=./data
```

### Confluence 설정 방법

**이제 API 토큰이 필요없습니다!** Playwright가 브라우저를 자동으로 조작하여 페이지를 직접 편집합니다.

1. Confluence 페이지 URL 복사:
   - 업데이트할 Confluence 페이지로 이동
   - 주소창의 전체 URL 복사
   - 예: `https://your-company.atlassian.net/wiki/spaces/TEAM/pages/123456789/Team+Calendar`

2. Confluence 로그인 정보:
   - 일반 사용자 계정 이메일
   - 비밀번호
   - 해당 페이지에 대한 편집 권한만 있으면 됩니다!

**장점:**
- ✅ API 토큰 설정 불필요
- ✅ 복잡한 권한 관리 불필요
- ✅ 일반 사용자 계정만 있으면 됨
- ✅ 실제 편집 UI를 사용하므로 더 안정적

## 설정

### 코드 커스터마이징

실제 회사 시스템에 맞게 다음 파일들을 수정해야 합니다:

#### 1. 로그인 로직 수정 ([src/modules/auth.js](src/modules/auth.js))

```javascript
// 실제 로그인 폼의 선택자로 변경
await page.fill('input[name="username"]', username); // 실제 선택자로 변경
await page.fill('input[name="password"]', password); // 실제 선택자로 변경
await page.click('button[type="submit"]'); // 실제 버튼 선택자로 변경
```

**선택자를 찾는 방법:**
1. 회사 로그인 페이지를 Chrome 브라우저로 엽니다
2. F12를 눌러 개발자 도구를 엽니다
3. 요소 선택 도구(🔍)를 클릭합니다
4. 사용자명 입력란을 클릭합니다
5. 하단에 표시되는 HTML 태그를 확인합니다
   - `<input id="username">` → 선택자: `#username`
   - `<input name="user">` → 선택자: `input[name="user"]`
   - `<input class="login-input">` → 선택자: `.login-input`

#### 2. 휴가 페이지 탐색 로직 수정 ([src/modules/vacation.js](src/modules/vacation.js))

```javascript
// 실제 클릭해야 할 메뉴나 버튼 추가
await page.click('nav a:has-text("휴가관리")');
await page.click('button:has-text("조회")');
```

#### 3. 데이터 파싱 로직 수정 ([src/modules/vacation.js](src/modules/vacation.js))

휴가 데이터의 실제 HTML 구조에 맞게 선택자를 수정합니다:

```javascript
const vacationData = await page.$$eval('.vacation-row', rows => {
  return rows.map(row => {
    return {
      employeeName: row.querySelector('.employee-name')?.textContent?.trim() || '',
      department: row.querySelector('.department')?.textContent?.trim() || '',
      // ... 실제 선택자로 변경
    };
  });
});
```

## 사용 방법

### 테스트 실행 (Dry Run)

Confluence 업데이트 없이 데이터 수집만 테스트:

```bash
npm test
# 또는
npm run start -- --dry-run
```

### 1회 실행

즉시 실행하고 종료:

```bash
npm run start -- --once
```

### 스케줄 모드

설정된 시간에 자동으로 반복 실행:

```bash
npm start
```

프로그램이 백그라운드에서 계속 실행되며, 설정된 시간(`.env`의 `CRON_SCHEDULE`)에 자동으로 동작합니다.

종료하려면 `Ctrl + C`를 누르세요.

### Cron 스케줄 형식

```
* * * * *
│ │ │ │ │
│ │ │ │ └─ 요일 (0-7, 0과 7은 일요일)
│ │ │ └─── 월 (1-12)
│ │ └───── 일 (1-31)
│ └─────── 시 (0-23)
└───────── 분 (0-59)
```

예제:
- `0 9 * * 1-5`: 평일(월-금) 오전 9시
- `0 9,18 * * *`: 매일 오전 9시와 오후 6시
- `*/30 * * * *`: 30분마다
- `0 9 1 * *`: 매월 1일 오전 9시

### 백그라운드 실행 (Linux/WSL)

```bash
# nohup으로 실행
nohup npm start > automation.log 2>&1 &

# PM2 사용 (권장)
npm install -g pm2
pm2 start src/index.js --name vacation-automation
pm2 logs vacation-automation  # 로그 확인
pm2 stop vacation-automation  # 중지
pm2 restart vacation-automation  # 재시작
```

## WSL 환경 설정

### WSL에서 Playwright 실행하기

네, WSL(Windows Subsystem for Linux) 환경에서도 이 프로그램을 실행할 수 있습니다!

#### WSL2 설치 (Windows 10/11)

1. PowerShell을 관리자 권한으로 실행
2. 다음 명령어 실행:

```powershell
wsl --install
```

3. 컴퓨터 재시작
4. Ubuntu가 자동으로 설치됩니다

#### WSL에서 프로젝트 설정

WSL 터미널에서:

```bash
# Node.js 설치 (NodeSource 사용)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 추가 의존성 설치 (Playwright 브라우저 실행에 필요)
sudo apt-get update
sudo apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2

# 프로젝트 폴더로 이동
cd /mnt/c/Users/YourUsername/path/to/project

# 의존성 설치
npm install
npm run install-browsers
```

#### WSL에서 주의사항

1. **파일 시스템**: WSL의 파일 시스템(`/home/username`)에서 작업하는 것이 Windows 파일 시스템(`/mnt/c/`)보다 빠릅니다.

2. **Headless 모드**: WSL에는 GUI가 없으므로 반드시 headless 모드로 실행해야 합니다:
   ```env
   HEADLESS=true
   ```

3. **WSLg (GUI 지원)**: Windows 11이나 최신 Windows 10에서는 WSLg가 포함되어 있어 GUI 앱도 실행 가능합니다. headless=false로도 실행할 수 있습니다.

#### Windows vs WSL 비교

| 특징 | Windows 네이티브 | WSL2 |
|------|-----------------|------|
| 설치 난이도 | 쉬움 | 중간 |
| 실행 속도 | 빠름 | 매우 빠름 |
| GUI 브라우저 | 가능 | WSLg 필요 (Windows 11) |
| 리소스 사용 | 보통 | 낮음 |
| 크론잡 설정 | 복잡 (Task Scheduler) | 쉬움 (cron) |

**권장사항**:
- 개발/테스트: Windows 네이티브 (GUI 확인 용이)
- 프로덕션/자동화: WSL2 (안정적, 리소스 효율적)

## 프로젝트 구조

```
testAbsent/
├── src/
│   ├── index.js                 # 메인 진입점
│   └── modules/
│       ├── auth.js              # 로그인 및 인증 관리
│       ├── vacation.js          # 휴가 데이터 수집 및 파싱
│       ├── dataManager.js       # 데이터 저장 및 비교
│       └── confluence.js        # Confluence API 연동
├── data/                        # 데이터 저장 폴더 (자동 생성)
│   ├── vacation-current.json   # 최신 휴가 데이터
│   └── history/                # 히스토리 백업
│       └── vacation-*.json     # 타임스탬프별 백업
├── .env                         # 환경 변수 (직접 생성)
├── .env.example                # 환경 변수 템플릿
├── .gitignore                   # Git 제외 파일 목록
├── package.json                # 프로젝트 설정
└── README.md                   # 이 파일
```

## 문제 해결

### 브라우저 실행 오류

**오류**: `browserType.launch: Executable doesn't exist`

**해결**:
```bash
npx playwright install chromium
```

### 로그인 실패

1. `.env` 파일의 로그인 정보 확인
2. `HEADLESS=false`로 설정하여 브라우저를 직접 확인
3. [src/modules/auth.js](src/modules/auth.js)의 선택자가 실제 웹페이지와 일치하는지 확인
4. 캡차나 2단계 인증이 있는지 확인

### 요소를 찾을 수 없음

**오류**: `TimeoutError: waiting for selector "#element" failed`

**해결**:
1. 선택자가 올바른지 확인
2. 페이지 로딩 대기 시간 증가:
   ```javascript
   await page.waitForSelector('#element', { timeout: 60000 }); // 60초
   ```
3. 개발자 도구(F12)로 실제 HTML 구조 확인

### Confluence 업데이트 실패

**오류**: 편집 버튼을 찾을 수 없음 또는 저장 실패

**해결**:
1. `HEADLESS=false`로 설정하여 브라우저를 직접 확인
2. 로그인 정보가 올바른지 확인
3. 해당 페이지에 대한 편집 권한이 있는지 확인
4. Confluence 페이지 URL이 정확한지 확인
5. 로그인 실패 시: 수동으로 로그인할 수 있도록 10초 대기 시간 활용

### WSL에서 브라우저 실행 오류

**해결**:
```bash
# 추가 의존성 설치
sudo npx playwright install-deps chromium

# 또는
sudo apt-get install -y $(npx playwright install-deps chromium --dry-run | grep "apt-get install" | cut -d' ' -f4-)
```

### 로그 확인

오류 발생 시 다음 위치에서 추가 정보를 확인할 수 있습니다:

1. **콘솔 출력**: 실행 중 출력되는 로그 메시지
2. **스크린샷**: `data/error-*.png` - 오류 발생 시 자동 저장
3. **데이터 파일**: `data/vacation-current.json` - 수집된 데이터 확인

## 디버깅 팁

### 1. Headless 모드 끄기

브라우저를 직접 보면서 디버깅:

```env
HEADLESS=false
```

### 2. 느리게 실행

각 단계를 천천히 실행:

```javascript
// src/index.js의 browser.launch 부분 수정
browser = await chromium.launch({
  headless: false,
  slowMo: 1000, // 1초씩 지연
});
```

### 3. 스크린샷 찍기

특정 시점의 화면 캡처:

```javascript
await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
```

### 4. 페이지 HTML 저장

```javascript
const html = await page.content();
await fs.writeFile('debug-page.html', html);
```

## 보안 고려사항

1. **.env 파일 보호**: `.env` 파일에 민감한 정보가 포함되므로 절대 공유하지 마세요
2. **Git 제외**: `.gitignore`에 `.env`가 포함되어 있는지 확인
3. **권한 관리**: Confluence API 토큰은 필요한 최소 권한만 부여
4. **정기적인 토큰 갱신**: 보안을 위해 API 토큰을 주기적으로 갱신

## 라이선스

ISC

## 기여

버그 리포트나 기능 제안은 이슈로 등록해주세요.
