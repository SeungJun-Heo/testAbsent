/**
 * 인증 관련 모듈
 * 회사 시스템 로그인 및 세션 관리
 */

import dotenv from 'dotenv';
dotenv.config();

/**
 * 로그인 상태 확인
 *
 * Selenium 비교:
 * - Selenium: driver.find_element(By.ID, "element")
 * - Playwright: page.locator('#element') 또는 page.$('#element')
 *
 * @param {import('playwright').Page} page - Playwright 페이지 객체
 * @returns {Promise<boolean>} 로그인 여부
 */
export async function checkLoginStatus(page) {
  try {
    // 회사 로그인 페이지로 이동
    await page.goto(process.env.COMPANY_LOGIN_URL, {
      waitUntil: 'networkidle', // 네트워크 요청이 완료될 때까지 대기
    });

    // 로그인 후 리다이렉트되는 URL 패턴 또는 로그인된 사용자만 볼 수 있는 요소 확인
    // 예제: 로그인 폼이 없으면 이미 로그인된 상태
    const loginForm = await page.$('form[name="loginForm"]'); // 실제 로그인 폼 선택자로 변경 필요

    if (!loginForm) {
      // 또는 로그인된 사용자의 프로필 요소 확인
      const userProfile = await page.$('.user-profile'); // 실제 선택자로 변경 필요
      return userProfile !== null;
    }

    return false;
  } catch (error) {
    console.error('로그인 상태 확인 중 오류:', error.message);
    return false;
  }
}

/**
 * 회사 시스템에 로그인
 *
 * Selenium 비교:
 * - Selenium: driver.find_element(By.ID, "username").send_keys("value")
 * - Playwright: page.fill('#username', 'value') 또는 page.type('#username', 'value')
 *
 * @param {import('playwright').Page} page - Playwright 페이지 객체
 */
export async function loginToCompany(page) {
  try {
    // 로그인 페이지로 이동
    await page.goto(process.env.COMPANY_LOGIN_URL, {
      waitUntil: 'domcontentloaded',
    });

    console.log('  - 로그인 페이지 로드 완료');

    // 사용자명 입력
    // 여러 방법으로 요소를 찾을 수 있습니다:
    // 1. CSS 선택자: await page.fill('#username', username)
    // 2. 텍스트: await page.fill('input[placeholder="Username"]', username)
    // 3. 레이블: await page.fill('input[name="username"]', username)
    await page.fill('input[name="username"]', process.env.COMPANY_USERNAME); // 실제 선택자로 변경 필요
    console.log('  - 사용자명 입력 완료');

    // 비밀번호 입력
    await page.fill('input[name="password"]', process.env.COMPANY_PASSWORD); // 실제 선택자로 변경 필요
    console.log('  - 비밀번호 입력 완료');

    // 로그인 버튼 클릭
    // Selenium의 element.click()과 유사
    // await page.click('button[type="submit"]');

    // 또는 더 안정적인 방법:
    // waitForNavigation과 함께 사용하여 페이지 전환 대기
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }), // 네비게이션 완료 대기
      page.click('button[type="submit"]'), // 실제 로그인 버튼 선택자로 변경 필요
    ]);

    console.log('  - 로그인 버튼 클릭 완료');

    // 로그인 성공 확인 (예: 대시보드 페이지 확인)
    // await page.waitForSelector('.dashboard', { timeout: 5000 }); // 실제 선택자로 변경 필요

    // 로그인 세션 저장 (선택사항)
    // 다음 실행 시 로그인 건너뛰기 가능
    // await page.context().storageState({ path: './auth-state.json' });

  } catch (error) {
    console.error('로그인 실패:', error.message);
    throw new Error(`로그인 프로세스 실패: ${error.message}`);
  }
}

/**
 * 로그아웃 (필요한 경우)
 *
 * @param {import('playwright').Page} page - Playwright 페이지 객체
 */
export async function logout(page) {
  try {
    // 로그아웃 버튼 클릭
    await page.click('.logout-button'); // 실제 선택자로 변경 필요
    await page.waitForNavigation();
    console.log('로그아웃 완료');
  } catch (error) {
    console.error('로그아웃 실패:', error.message);
  }
}
