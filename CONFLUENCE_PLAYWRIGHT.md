# Confluence 연동 방식 변경: API → Playwright

Confluence API 대신 Playwright로 직접 페이지를 편집하는 방식으로 변경되었습니다.

## 변경 이유

### 기존 방식 (API)의 문제점
- ❌ API 토큰 발급 필요
- ❌ 복잡한 권한 설정 필요
- ❌ API 토큰 관리 부담
- ❌ API 버전 변경 시 코드 수정 필요
- ❌ Storage Format HTML 작성이 복잡

### 새 방식 (Playwright)의 장점
- ✅ **API 토큰 불필요** - 일반 로그인 계정만 있으면 됨
- ✅ **간단한 설정** - 페이지 URL과 로그인 정보만 있으면 됨
- ✅ **안정적** - 실제 편집 UI를 사용하므로 UI 변경에도 대응 가능
- ✅ **직관적** - 사람이 하는 것과 동일한 방식으로 동작
- ✅ **권한 관리 용이** - 해당 페이지 편집 권한만 있으면 됨

## 설정 방법 비교

### 기존 방식 (API)
```env
CONFLUENCE_BASE_URL=https://your-confluence.atlassian.net
CONFLUENCE_USERNAME=your-email@company.com
CONFLUENCE_API_TOKEN=your-api-token-here        # ← 발급 필요!
CONFLUENCE_PAGE_ID=123456789                     # ← 페이지 ID만
```

**추가 작업:**
1. Atlassian 계정 설정 페이지 방문
2. API 토큰 생성
3. 토큰 복사 및 저장
4. 페이지 ID 추출

### 새 방식 (Playwright)
```env
CONFLUENCE_PAGE_URL=https://your-confluence.atlassian.net/wiki/spaces/TEAM/pages/123456789/Team+Calendar
CONFLUENCE_USERNAME=your-email@company.com
CONFLUENCE_PASSWORD=your-password               # ← 일반 비밀번호
CONFLUENCE_LOGIN_URL=https://your-confluence.atlassian.net/login
```

**작업:**
1. Confluence 페이지 URL 복사 붙여넣기 끝!

## 코드 변경 사항

### [src/modules/confluence.js](src/modules/confluence.js)

**기존 (API 방식):**
```javascript
export async function updateConfluencePage(vacationData, changes) {
  // 1. API로 현재 페이지 정보 가져오기
  const currentPage = await fetch(`${baseUrl}/rest/api/content/${pageId}`);

  // 2. Storage Format HTML 생성
  const html = '<table><tbody>...</tbody></table>';

  // 3. API로 업데이트
  await fetch(`${baseUrl}/rest/api/content/${pageId}`, {
    method: 'PUT',
    body: JSON.stringify({ ... })
  });
}
```

**새 방식 (Playwright):**
```javascript
export async function updateConfluencePage(vacationData, changes, browser) {
  // 1. 브라우저로 페이지 열기
  const page = await browser.newPage();
  await page.goto(CONFLUENCE_PAGE_URL);

  // 2. 로그인 (필요시)
  await loginToConfluence(page);

  // 3. 편집 버튼 클릭
  await page.click('button:has-text("편집")');

  // 4. 에디터에서 내용 수정
  await page.type(editorSelector, '새 내용...');

  // 5. 게시 버튼 클릭
  await page.click('button:has-text("게시")');
}
```

## 주요 기능

### 1. 자동 로그인
```javascript
async function loginToConfluence(page) {
  // Atlassian 통합 로그인 처리
  await page.fill('input[name="username"]', username);
  await page.click('button:has-text("Continue")');
  await page.fill('input[name="password"]', password);
  await page.click('button:has-text("Log in")');
}
```

### 2. 편집기 자동 감지
- **새 Confluence 에디터** (Fabric Editor)
- **기존 Confluence 에디터** (Legacy/TinyMCE)

두 가지 에디터 모두 지원하며 자동으로 감지합니다.

### 3. 다양한 선택자 지원
편집 버튼과 게시 버튼을 여러 선택자로 시도하여 안정성을 높였습니다:

```javascript
const editSelectors = [
  'button:has-text("편집")',
  'button:has-text("Edit")',
  'a:has-text("편집")',
  'a:has-text("Edit")',
  '#editPageLink',
  '[data-test-id="edit-page-button"]',
  '.edit-page-button',
];
```

### 4. 오류 시 스크린샷
문제 발생 시 자동으로 스크린샷을 저장합니다:
```javascript
const errorPath = `${DATA_DIR}/confluence-error-${Date.now()}.png`;
await page.screenshot({ path: errorPath, fullPage: true });
```

## 테스트 방법

### 1. Confluence 편집 테스트
```bash
npm run test-confluence
```

이 명령어는:
- Confluence 페이지에 접속
- 로그인 수행
- 편집 모드로 전환
- 테스트 텍스트 입력
- 편집기 타입 확인
- 게시 버튼 확인

실제로 게시하지 않고 테스트만 수행합니다.

### 2. 전체 자동화 테스트
```bash
npm test                # Dry run (Confluence 업데이트 안 함)
npm run start -- --once # 실제 업데이트 1회 실행
```

## 동작 흐름

```
1. 회사 시스템 로그인
   ↓
2. 휴가 데이터 수집
   ↓
3. JSON 저장 및 변경사항 감지
   ↓
4. Confluence 페이지 열기
   ↓
5. Confluence 로그인 (필요시)
   ↓
6. 편집 버튼 클릭
   ↓
7. 에디터 타입 감지
   ↓
8. 기존 내용 삭제
   ↓
9. 새 내용 입력
   ↓
10. 게시 버튼 클릭
   ↓
11. 완료!
```

## 문제 해결

### 로그인 실패
```bash
# .env에서 headless 모드 끄기
HEADLESS=false
```

브라우저가 열리면 수동으로 로그인할 수 있도록 10초 대기합니다.

### 편집 버튼을 찾을 수 없음
1. 해당 페이지에 편집 권한이 있는지 확인
2. 페이지 URL이 정확한지 확인
3. `npm run test-confluence`로 테스트

### 에디터를 찾을 수 없음
페이지가 편집 모드로 전환되지 않았을 가능성:
1. `HEADLESS=false`로 설정하여 브라우저 확인
2. 편집 버튼 클릭 후 3초 대기 (현재 설정)
3. 필요시 대기 시간 증가

## 브라우저 세션 재사용

메인 자동화 스크립트에서는 이미 열려있는 브라우저를 재사용할 수 있습니다:

```javascript
// src/index.js에서
const browser = await chromium.launch();
const page = await browser.newPage();

// 회사 시스템에서 휴가 데이터 수집
await loginToCompany(page);
const vacationData = await parseVacationData(page);

// 같은 브라우저로 Confluence 업데이트
await updateConfluencePage(vacationData, changes, browser);
```

이렇게 하면:
- 브라우저를 한 번만 실행
- 메모리 효율적
- 더 빠른 실행

## 보안 고려사항

### API 방식
- ✅ API 토큰은 암호화되어 전송
- ❌ 토큰이 유출되면 모든 Confluence 접근 가능
- ❌ 토큰 만료 관리 필요

### Playwright 방식
- ✅ 일반 비밀번호 사용 (기존 계정 보안 정책 적용)
- ✅ 세션은 일시적이며 스크립트 종료 시 삭제
- ✅ 페이지별 권한으로 제한 가능

**추가 보안 팁:**
```bash
# .env 파일 권한 설정 (Linux/WSL)
chmod 600 .env

# Git에서 제외 (이미 .gitignore에 포함됨)
echo ".env" >> .gitignore
```

## 마이그레이션 가이드

기존 API 방식을 사용 중이라면:

### 1. .env 파일 수정
```diff
- CONFLUENCE_BASE_URL=...
- CONFLUENCE_API_TOKEN=...
- CONFLUENCE_PAGE_ID=...
+ CONFLUENCE_PAGE_URL=https://your-confluence.../pages/123456789/Team+Calendar
+ CONFLUENCE_PASSWORD=your-password
+ CONFLUENCE_LOGIN_URL=https://your-confluence.../login
```

### 2. 코드는 수정 불필요
[src/modules/confluence.js](src/modules/confluence.js) 파일이 자동으로 새 방식을 사용합니다.

### 3. 테스트
```bash
npm run test-confluence  # Confluence 편집 테스트
npm test                 # 전체 테스트 (Dry run)
npm run start -- --once  # 실제 실행
```

## 참고 자료

- [Playwright 공식 문서](https://playwright.dev)
- [Confluence Cloud 문서](https://confluence.atlassian.com)
- [프로젝트 README](README.md)
