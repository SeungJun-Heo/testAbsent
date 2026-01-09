/**
 * 인증 관련 모듈
 * 회사 시스템 로그인 상태 확인
 *
 * 이 모듈은 자동 로그인을 수행하지 않습니다.
 * 사용자가 브라우저에서 직접 로그인한 상태를 확인만 합니다.
 */

import dotenv from 'dotenv';
dotenv.config();

// 재시도 설정
const RETRY_INTERVAL = parseInt(process.env.LOGIN_CHECK_RETRY_INTERVAL) || 10 * 60 * 1000; // 기본 10분
const MAX_RETRY_DURATION = parseInt(process.env.LOGIN_CHECK_MAX_DURATION) || 2 * 60 * 60 * 1000; // 기본 2시간

/**
 * 로그인 상태 확인
 *
 * @param {import('playwright').Page} page - Playwright 페이지 객체
 * @returns {Promise<boolean>} 로그인 여부
 */
export async function checkLoginStatus(page) {
  try {
    // 회사 메인 페이지 또는 로그인 확인용 페이지로 이동
    await page.goto(process.env.COMPANY_LOGIN_URL || process.env.VACATION_PAGE_URL, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // 방법 1: 로그인 폼이 있는지 확인 (있으면 로그인 안 됨)
    const loginForm = await page.$('form[name="loginForm"], form[id="loginForm"], form.login-form');

    if (loginForm) {
      // 로그인 폼이 보이면 로그인 안 된 상태
      return false;
    }

    // 방법 2: 로그인된 사용자만 볼 수 있는 요소 확인
    // 아래 선택자들을 실제 회사 시스템에 맞게 수정하세요
    const loggedInSelectors = [
      '.user-profile',
      '.user-menu',
      '#user-name',
      '[data-testid="user-menu"]',
      '.header-user',
      '.logged-in',
    ];

    for (const selector of loggedInSelectors) {
      const element = await page.$(selector);
      if (element) {
        const isVisible = await element.isVisible();
        if (isVisible) {
          return true;
        }
      }
    }

    // 방법 3: URL 확인 (로그인하지 않으면 /login으로 리다이렉트되는 경우)
    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('/signin') || currentUrl.includes('/auth')) {
      return false;
    }

    // 방법 4: 쿠키 확인 (선택사항)
    const cookies = await page.context().cookies();
    const hasSessionCookie = cookies.some(cookie =>
      cookie.name.toLowerCase().includes('session') ||
      cookie.name.toLowerCase().includes('token') ||
      cookie.name.toLowerCase().includes('auth')
    );

    if (hasSessionCookie) {
      return true;
    }

    // 기본적으로 로그인 안 된 것으로 간주
    return false;

  } catch (error) {
    console.error('로그인 상태 확인 중 오류:', error.message);
    return false;
  }
}

/**
 * 로그인 상태를 확인하고 로그인될 때까지 재시도
 *
 * @param {import('playwright').Page} page - Playwright 페이지 객체
 * @returns {Promise<boolean>} 로그인 성공 여부
 */
export async function waitForLogin(page) {
  const startTime = Date.now();
  let attemptCount = 0;

  console.log('\n로그인 상태 확인 중...');
  console.log(`설정:`);
  console.log(`  - 재시도 간격: ${RETRY_INTERVAL / 1000 / 60}분`);
  console.log(`  - 최대 대기 시간: ${MAX_RETRY_DURATION / 1000 / 60 / 60}시간`);

  while (true) {
    attemptCount++;
    const elapsedTime = Date.now() - startTime;

    console.log(`\n[시도 ${attemptCount}] 로그인 상태 확인 중... (경과 시간: ${Math.floor(elapsedTime / 1000 / 60)}분)`);

    const isLoggedIn = await checkLoginStatus(page);

    if (isLoggedIn) {
      console.log('✓ 로그인 확인됨!');

      // 세션 저장 (USE_SAVED_SESSION=true인 경우)
      if (process.env.USE_SAVED_SESSION === 'true') {
        try {
          const sessionFile = process.env.SESSION_FILE || './auth-state.json';
          await page.context().storageState({ path: sessionFile });
          console.log(`✓ 세션 저장: ${sessionFile}`);
        } catch (e) {
          console.log('⚠️  세션 저장 실패 (무시 가능):', e.message);
        }
      }

      return true;
    }

    // 최대 대기 시간 초과 확인
    if (elapsedTime >= MAX_RETRY_DURATION) {
      console.error(`\n❌ 최대 대기 시간(${MAX_RETRY_DURATION / 1000 / 60 / 60}시간) 초과`);
      console.error('로그인되지 않아 프로그램을 종료합니다.');
      return false;
    }

    // 다음 재시도까지 대기
    const waitMinutes = RETRY_INTERVAL / 1000 / 60;
    console.log(`⏳ 로그인되지 않았습니다. ${waitMinutes}분 후 다시 확인합니다...`);
    console.log(`💡 브라우저에서 로그인해주세요.`);
    console.log(`💡 남은 대기 시간: ${Math.floor((MAX_RETRY_DURATION - elapsedTime) / 1000 / 60)}분`);

    // 대기 (취소 가능하도록 작은 단위로 나눔)
    const waitSteps = 10;
    const stepDuration = RETRY_INTERVAL / waitSteps;

    for (let i = 0; i < waitSteps; i++) {
      await page.waitForTimeout(stepDuration);

      // 중간에 로그인되었는지 확인 (선택사항)
      if (i % 3 === 0) { // 30% 지점마다 확인
        const checkAgain = await checkLoginStatus(page);
        if (checkAgain) {
          console.log('✓ 로그인 확인됨!');
          return true;
        }
      }
    }
  }
}

/**
 * 로그인 상태를 확인하고 필요시 사용자에게 알림
 * (간단한 버전 - 한 번만 확인하고 로그인 안 되어 있으면 대기)
 *
 * @param {import('playwright').Page} page - Playwright 페이지 객체
 * @param {number} waitTime - 로그인 대기 시간 (밀리초, 기본: 60초)
 * @returns {Promise<boolean>} 로그인 여부
 */
export async function checkAndWaitForLogin(page, waitTime = 60000) {
  console.log('\n로그인 상태 확인 중...');

  const isLoggedIn = await checkLoginStatus(page);

  if (isLoggedIn) {
    console.log('✓ 이미 로그인되어 있습니다.');
    return true;
  }

  console.log('⚠️  로그인되지 않았습니다.');
  console.log(`💡 브라우저에서 로그인해주세요. ${waitTime / 1000}초 대기합니다...`);

  // 사용자가 로그인할 시간 제공
  await page.waitForTimeout(waitTime);

  // 다시 확인
  const isLoggedInNow = await checkLoginStatus(page);

  if (isLoggedInNow) {
    console.log('✓ 로그인 확인됨!');
    return true;
  } else {
    console.log('❌ 여전히 로그인되지 않았습니다.');
    return false;
  }
}

/**
 * 로그인 확인을 위한 선택자 설정 도우미
 *
 * .env 파일에 다음 형식으로 설정할 수 있습니다:
 * LOGIN_INDICATOR_SELECTOR=.user-profile
 *
 * @param {import('playwright').Page} page - Playwright 페이지 객체
 * @returns {Promise<boolean>} 로그인 여부
 */
export async function checkLoginWithCustomSelector(page) {
  try {
    const customSelector = process.env.LOGIN_INDICATOR_SELECTOR;

    if (!customSelector) {
      // 커스텀 선택자가 없으면 기본 방법 사용
      return await checkLoginStatus(page);
    }

    await page.goto(process.env.COMPANY_LOGIN_URL || process.env.VACATION_PAGE_URL, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    const element = await page.$(customSelector);

    if (element) {
      const isVisible = await element.isVisible();
      return isVisible;
    }

    return false;

  } catch (error) {
    console.error('로그인 상태 확인 중 오류:', error.message);
    return false;
  }
}
