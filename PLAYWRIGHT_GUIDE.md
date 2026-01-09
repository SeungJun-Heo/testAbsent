# Playwright 가이드 (Selenium 사용자용)

Selenium을 사용하셨다면 이 가이드로 Playwright를 쉽게 배울 수 있습니다.

## 핵심 개념 비교

### 1. 브라우저 시작

**Selenium (Python):**
```python
from selenium import webdriver

driver = webdriver.Chrome()
driver.get("https://example.com")
```

**Playwright (JavaScript):**
```javascript
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('https://example.com');
```

### 2. 요소 찾기

**Selenium:**
```python
from selenium.webdriver.common.by import By

# ID로 찾기
element = driver.find_element(By.ID, "username")

# CSS 선택자로 찾기
element = driver.find_element(By.CSS_SELECTOR, ".login-form input")

# XPath로 찾기
element = driver.find_element(By.XPATH, "//input[@name='username']")

# 여러 요소 찾기
elements = driver.find_elements(By.CLASS_NAME, "item")
```

**Playwright:**
```javascript
// CSS 선택자 (모든 경우에 사용 가능)
const element = await page.$('#username');  // 단일 요소
const elements = await page.$$('.item');     // 여러 요소

// 또는 더 강력한 locator API
const element = page.locator('#username');
const elements = page.locator('.item');

// XPath도 지원
const element = await page.$('xpath=//input[@name="username"]');

// 텍스트로 찾기 (Playwright만의 강력한 기능!)
await page.click('text=로그인');
await page.click('button:has-text("제출")');
```

### 3. 요소 상호작용

**Selenium:**
```python
# 클릭
element.click()

# 텍스트 입력
element.send_keys("hello")

# 텍스트 지우고 입력
element.clear()
element.send_keys("hello")

# 드롭다운 선택
from selenium.webdriver.support.ui import Select
select = Select(driver.find_element(By.ID, "dropdown"))
select.select_by_visible_text("Option 1")
```

**Playwright:**
```javascript
// 클릭
await page.click('#button');

// 텍스트 입력 (자동으로 지우고 입력)
await page.fill('#input', 'hello');

// 한 글자씩 입력 (키보드 시뮬레이션)
await page.type('#input', 'hello');

// 드롭다운 선택
await page.selectOption('#dropdown', 'Option 1');
// 또는
await page.selectOption('#dropdown', { label: 'Option 1' });
```

### 4. 대기 (Wait)

**Selenium:**
```python
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# 명시적 대기
wait = WebDriverWait(driver, 10)
element = wait.until(
    EC.presence_of_element_located((By.ID, "myElement"))
)

# 암묵적 대기
driver.implicitly_wait(10)

# 고정 대기 (권장하지 않음)
import time
time.sleep(5)
```

**Playwright:**
```javascript
// 자동 대기! (가장 큰 장점)
// 대부분의 작업은 자동으로 요소가 준비될 때까지 대기
await page.click('#button');  // 버튼이 나타날 때까지 자동 대기

// 명시적 대기
await page.waitForSelector('#myElement');
await page.waitForSelector('#myElement', { state: 'visible' });
await page.waitForSelector('#myElement', { state: 'hidden' });

// 네비게이션 대기
await page.waitForLoadState('networkidle');
await page.waitForLoadState('domcontentloaded');

// URL 변경 대기
await page.waitForURL('**/success');

// 고정 대기 (필요시)
await page.waitForTimeout(5000);
```

### 5. 데이터 추출

**Selenium:**
```python
# 텍스트 가져오기
text = element.text

# 속성 가져오기
value = element.get_attribute("value")

# 여러 요소에서 데이터 추출
rows = driver.find_elements(By.CSS_SELECTOR, ".row")
data = []
for row in rows:
    name = row.find_element(By.CLASS_NAME, "name").text
    data.append({"name": name})
```

**Playwright:**
```javascript
// 텍스트 가져오기
const text = await page.textContent('#element');
const innerText = await page.innerText('#element');

// 속성 가져오기
const value = await page.getAttribute('#element', 'value');

// 여러 요소에서 데이터 추출 (방법 1: JavaScript 실행)
const data = await page.$$eval('.row', rows => {
    return rows.map(row => ({
        name: row.querySelector('.name').textContent.trim()
    }));
});

// 방법 2: 반복문 사용
const rows = await page.$$('.row');
const data = [];
for (const row of rows) {
    const name = await row.$eval('.name', el => el.textContent.trim());
    data.push({ name });
}
```

### 6. 페이지 탐색

**Selenium:**
```python
# URL 이동
driver.get("https://example.com")

# 뒤로 가기
driver.back()

# 앞으로 가기
driver.forward()

# 새로고침
driver.refresh()

# 현재 URL
current_url = driver.current_url
```

**Playwright:**
```javascript
// URL 이동
await page.goto('https://example.com');

// 뒤로 가기
await page.goBack();

// 앞으로 가기
await page.goForward();

// 새로고침
await page.reload();

// 현재 URL
const url = page.url();
```

### 7. JavaScript 실행

**Selenium:**
```python
# JavaScript 실행
result = driver.execute_script("return document.title")

# 요소에 대해 실행
driver.execute_script("arguments[0].click()", element)
```

**Playwright:**
```javascript
// JavaScript 실행
const result = await page.evaluate(() => document.title);

// 매개변수 전달
const result = await page.evaluate((x, y) => x + y, 5, 3);

// 요소에 대해 실행
const element = await page.$('#button');
await element.evaluate(el => el.click());
```

### 8. 스크린샷

**Selenium:**
```python
# 스크린샷
driver.save_screenshot("screenshot.png")

# 요소 스크린샷 (일부 드라이버만 지원)
element.screenshot("element.png")
```

**Playwright:**
```javascript
// 전체 페이지 스크린샷
await page.screenshot({ path: 'screenshot.png' });

// 전체 스크롤 포함
await page.screenshot({ path: 'full.png', fullPage: true });

// 특정 요소만
await page.locator('#element').screenshot({ path: 'element.png' });
```

### 9. 다중 탭/윈도우

**Selenium:**
```python
# 새 탭 열기
driver.execute_script("window.open('');")
driver.switch_to.window(driver.window_handles[1])

# 윈도우 간 전환
driver.switch_to.window(driver.window_handles[0])
```

**Playwright:**
```javascript
// 새 탭 열기
const newPage = await context.newPage();
await newPage.goto('https://example.com');

// 링크 클릭으로 열리는 새 탭 처리
const [newPage] = await Promise.all([
    context.waitForEvent('page'),
    page.click('a[target="_blank"]')
]);
```

### 10. 프레임/iframe

**Selenium:**
```python
# iframe으로 전환
iframe = driver.find_element(By.ID, "myframe")
driver.switch_to.frame(iframe)

# 다시 메인 프레임으로
driver.switch_to.default_content()
```

**Playwright:**
```javascript
// iframe 내부 요소 접근
const frame = page.frame({ name: 'myframe' });
await frame.click('#button');

// 또는
const frameElement = await page.$('#myframe');
const frame = await frameElement.contentFrame();
await frame.click('#button');
```

## Playwright만의 강력한 기능

### 1. 자동 대기 (Auto-waiting)

Selenium에서는 명시적으로 대기 코드를 작성해야 하지만, Playwright는 자동으로 처리:

```javascript
// 이 한 줄이면 충분! 자동으로:
// 1. 요소가 DOM에 나타날 때까지 대기
// 2. 요소가 보일 때까지 대기
// 3. 요소가 활성화될 때까지 대기
await page.click('#button');
```

### 2. 네트워크 인터셉트

```javascript
// 네트워크 요청 가로채기
await page.route('**/api/data', route => {
    route.fulfill({
        status: 200,
        body: JSON.stringify({ mock: 'data' })
    });
});

// 요청 모니터링
page.on('request', request => console.log('요청:', request.url()));
page.on('response', response => console.log('응답:', response.url()));
```

### 3. 더 나은 선택자

```javascript
// 텍스트로 찾기
await page.click('text=로그인');

// 포함하는 텍스트
await page.click('button:has-text("제출")');

// CSS와 텍스트 조합
await page.click('button:has-text("확인")');

// 역할(Role)로 찾기 (접근성 기반)
await page.click('role=button[name="로그인"]');
```

### 4. 병렬 실행

```javascript
// 여러 작업을 동시에 실행
await Promise.all([
    page.click('#button1'),
    page.click('#button2'),
    page.click('#button3'),
]);
```

## 실전 예제 비교

### 예제: 로그인 후 데이터 수집

**Selenium:**
```python
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

driver = webdriver.Chrome()
driver.get("https://example.com/login")

# 로그인
wait = WebDriverWait(driver, 10)
username = wait.until(EC.presence_of_element_located((By.ID, "username")))
username.send_keys("myuser")
driver.find_element(By.ID, "password").send_keys("mypass")
driver.find_element(By.ID, "login-button").click()

# 데이터 페이지 대기
wait.until(EC.presence_of_element_located((By.CLASS_NAME, "data-row")))

# 데이터 수집
rows = driver.find_elements(By.CLASS_NAME, "data-row")
data = []
for row in rows:
    name = row.find_element(By.CLASS_NAME, "name").text
    value = row.find_element(By.CLASS_NAME, "value").text
    data.append({"name": name, "value": value})

driver.quit()
```

**Playwright:**
```javascript
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('https://example.com/login');

// 로그인 (자동 대기!)
await page.fill('#username', 'myuser');
await page.fill('#password', 'mypass');
await page.click('#login-button');

// 데이터 수집 (한 번에!)
const data = await page.$$eval('.data-row', rows => {
    return rows.map(row => ({
        name: row.querySelector('.name').textContent.trim(),
        value: row.querySelector('.value').textContent.trim()
    }));
});

await browser.close();
```

## 성능 비교

| 작업 | Selenium | Playwright |
|------|----------|------------|
| 브라우저 시작 | ~2-3초 | ~1초 |
| 페이지 로드 | 보통 | 빠름 |
| 요소 찾기 | 보통 | 매우 빠름 |
| 대기 처리 | 수동 | 자동 |
| 전체 실행 시간 | 기준 | 30-50% 빠름 |

## 마이그레이션 팁

1. **선택자 변환**: 대부분의 CSS 선택자는 그대로 사용 가능
2. **대기 제거**: 명시적 대기 코드 대부분 제거 가능
3. **async/await**: JavaScript의 비동기 패턴에 익숙해지기
4. **텍스트 선택자 활용**: ID나 클래스 대신 텍스트로 요소 찾기

## 참고 자료

- [Playwright 공식 문서](https://playwright.dev)
- [Playwright API 레퍼런스](https://playwright.dev/docs/api/class-page)
- [예제 코드](https://github.com/microsoft/playwright/tree/main/examples)
