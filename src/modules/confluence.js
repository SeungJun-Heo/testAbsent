/**
 * Confluence 페이지 자동 업데이트 모듈 (Playwright 사용)
 *
 * API 대신 Playwright로 직접 브라우저를 조작하여 Confluence 페이지를 수정합니다.
 * 이 방식의 장점:
 * - API 토큰 설정 불필요
 * - 일반 사용자 계정만 있으면 됨
 * - 실제 편집 UI를 사용하므로 더 안정적
 */

import dotenv from 'dotenv';
dotenv.config();

/**
 * 휴가 데이터를 텍스트 형식으로 변환
 *
 * @param {Array} vacationData - 휴가 데이터
 * @returns {string} 포맷된 텍스트
 */
function formatVacationDataAsText(vacationData) {
  // 날짜순으로 정렬
  const sortedData = [...vacationData].sort((a, b) => {
    return new Date(a.startDate) - new Date(b.startDate);
  });

  let text = '';

  // 현재 날짜 기준으로 그룹화
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = sortedData.filter(item => new Date(item.startDate) >= today);
  const past = sortedData.filter(item => new Date(item.startDate) < today);

  // 예정된 휴가
  if (upcoming.length > 0) {
    text += '📅 예정된 휴가\n\n';
    upcoming.forEach(item => {
      text += `• ${item.employeeName} (${item.department})\n`;
      text += `  ${item.vacationType} | ${item.startDate} ~ ${item.endDate} (${item.days}일)\n`;
      text += `  상태: ${item.status}\n\n`;
    });
  }

  // 지난 휴가
  if (past.length > 0) {
    text += '\n📝 최근 사용한 휴가\n\n';
    past.slice(-5).reverse().forEach(item => { // 최근 5개만
      text += `• ${item.employeeName} (${item.department})\n`;
      text += `  ${item.vacationType} | ${item.startDate} ~ ${item.endDate} (${item.days}일)\n\n`;
    });
  }

  return text;
}

/**
 * 휴가 데이터를 Confluence 테이블 마크다운으로 변환
 *
 * @param {Array} vacationData - 휴가 데이터
 * @returns {string} Confluence 테이블 마크다운
 */
function formatVacationDataAsTable(vacationData) {
  // 날짜순으로 정렬
  const sortedData = [...vacationData].sort((a, b) => {
    return new Date(a.startDate) - new Date(b.startDate);
  });

  // Confluence 테이블 생성
  let table = '| 이름 | 부서 | 휴가 종류 | 시작일 | 종료일 | 일수 | 상태 |\n';
  table += '|------|------|-----------|--------|--------|------|------|\n';

  sortedData.forEach(item => {
    table += `| ${item.employeeName} | ${item.department} | ${item.vacationType} | ${item.startDate} | ${item.endDate} | ${item.days} | ${item.status} |\n`;
  });

  return table;
}

/**
 * Confluence 로그인 상태 확인
 *
 * @param {import('playwright').Page} page - Playwright 페이지 객체
 * @returns {Promise<boolean>} 로그인 여부
 */
async function checkConfluenceLogin(page) {
  try {
    const isLoggedIn = await page.evaluate(() => {
      // Confluence는 로그인되어 있으면 특정 요소가 있음
      return document.querySelector('#user-menu-link, [data-test-id="user-menu"], .confluence-userinfo') !== null;
    });

    return isLoggedIn;
  } catch (error) {
    return false;
  }
}

/**
 * Confluence 로그인 대기
 * 사용자가 직접 로그인할 때까지 대기합니다.
 *
 * @param {import('playwright').Page} page - Playwright 페이지 객체
 * @param {number} waitTime - 대기 시간 (밀리초)
 */
async function waitForConfluenceLogin(page, waitTime = 60000) {
  console.log('  - Confluence 로그인 상태 확인 중...');

  const isLoggedIn = await checkConfluenceLogin(page);

  if (isLoggedIn) {
    console.log('  ✓ 이미 Confluence에 로그인되어 있습니다.');
    return true;
  }

  console.log('  ⚠️  Confluence에 로그인되지 않았습니다.');
  console.log(`  💡 브라우저에서 Confluence에 로그인해주세요. ${waitTime / 1000}초 대기합니다...`);

  // 사용자가 로그인할 시간 제공
  await page.waitForTimeout(waitTime);

  // 다시 확인
  const isLoggedInNow = await checkConfluenceLogin(page);

  if (isLoggedInNow) {
    console.log('  ✓ Confluence 로그인 확인됨!');
    return true;
  } else {
    console.log('  ⚠️  여전히 로그인되지 않았습니다. 계속 진행합니다...');
    return false;
  }
}

/**
 * Confluence 페이지 업데이트 (Playwright 사용)
 *
 * @param {Array} vacationData - 업데이트할 휴가 데이터
 * @param {Object} changes - 변경사항
 * @param {import('playwright').Browser} browser - Playwright 브라우저 객체 (선택사항, 없으면 새로 생성)
 */
export async function updateConfluencePage(vacationData, changes, browser = null) {
  let shouldCloseBrowser = false;
  let page = null;

  try {
    console.log('  - Confluence 페이지 업데이트 시작...');

    // 브라우저가 제공되지 않았으면 새로 생성
    if (!browser) {
      const { chromium } = await import('playwright');
      browser = await chromium.launch({
        headless: process.env.HEADLESS === 'true',
        slowMo: 100,
      });
      shouldCloseBrowser = true;
    }

    // 새 페이지 생성
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    page = await context.newPage();

    // Confluence 로그인 확인
    await waitForConfluenceLogin(page);

    // Confluence 페이지로 이동
    console.log('  - Confluence 페이지로 이동 중...');
    await page.goto(process.env.CONFLUENCE_PAGE_URL, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // 편집 모드로 전환
    console.log('  - 편집 모드로 전환 중...');

    // 편집 버튼 찾기 및 클릭 (여러 가지 선택자 시도)
    const editSelectors = [
      'button:has-text("편집")',
      'button:has-text("Edit")',
      'a:has-text("편집")',
      'a:has-text("Edit")',
      '#editPageLink',
      '[data-test-id="edit-page-button"]',
      '.edit-page-button',
    ];

    let editClicked = false;
    for (const selector of editSelectors) {
      try {
        const button = await page.$(selector);
        if (button) {
          await button.click();
          editClicked = true;
          console.log(`  ✓ 편집 버튼 클릭 완료 (${selector})`);
          break;
        }
      } catch (e) {
        // 계속 시도
      }
    }

    if (!editClicked) {
      throw new Error('편집 버튼을 찾을 수 없습니다. 페이지 권한을 확인해주세요.');
    }

    // 편집기 로딩 대기
    await page.waitForTimeout(3000);

    // Confluence 에디터 타입 확인 (새 에디터 vs 구 에디터)
    const isNewEditor = await page.$('[data-test-id="fabric-editor-container"]') !== null;

    if (isNewEditor) {
      console.log('  - 새 Confluence 에디터 감지');
      await updateWithNewEditor(page, vacationData, changes);
    } else {
      console.log('  - 기존 Confluence 에디터 감지');
      await updateWithLegacyEditor(page, vacationData, changes);
    }

    // 변경사항 저장
    console.log('  - 변경사항 저장 중...');

    const publishSelectors = [
      'button:has-text("게시")',
      'button:has-text("Publish")',
      'button:has-text("저장")',
      'button:has-text("Save")',
      '[data-test-id="publish-button"]',
      '#rte-button-publish',
    ];

    let published = false;
    for (const selector of publishSelectors) {
      try {
        const button = await page.$(selector);
        if (button && await button.isVisible()) {
          await button.click();
          published = true;
          console.log(`  ✓ 게시 버튼 클릭 완료 (${selector})`);
          break;
        }
      } catch (e) {
        // 계속 시도
      }
    }

    if (!published) {
      throw new Error('게시 버튼을 찾을 수 없습니다.');
    }

    // 저장 완료 대기
    await page.waitForTimeout(3000);

    console.log('  ✓ Confluence 페이지 업데이트 완료');
    console.log(`  ✓ URL: ${process.env.CONFLUENCE_PAGE_URL}`);

    // 스크린샷 저장 (선택사항)
    const screenshotPath = `${process.env.DATA_DIR || './data'}/confluence-updated.png`;
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`  ✓ 스크린샷 저장: ${screenshotPath}`);

  } catch (error) {
    console.error('  ❌ Confluence 업데이트 실패:', error.message);

    // 오류 시 스크린샷
    if (page) {
      try {
        const errorPath = `${process.env.DATA_DIR || './data'}/confluence-error-${Date.now()}.png`;
        await page.screenshot({ path: errorPath, fullPage: true });
        console.log(`  📸 오류 스크린샷: ${errorPath}`);
      } catch (e) {
        // 무시
      }
    }

    throw error;
  } finally {
    // 브라우저 정리
    if (page) {
      await page.close().catch(() => {});
    }
    if (shouldCloseBrowser && browser) {
      await browser.close().catch(() => {});
    }
  }
}

/**
 * 새 Confluence 에디터에서 내용 업데이트
 *
 * @param {import('playwright').Page} page - Playwright 페이지 객체
 * @param {Array} vacationData - 휴가 데이터
 * @param {Object} changes - 변경사항
 */
async function updateWithNewEditor(page, vacationData, changes) {
  // 에디터 영역 찾기
  const editorSelector = '[data-test-id="fabric-editor-container"] [contenteditable="true"]';
  await page.waitForSelector(editorSelector, { timeout: 10000 });

  // 기존 내용 전체 선택 및 삭제
  await page.click(editorSelector);
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');

  console.log('  - 기존 내용 삭제 완료');

  // 업데이트 정보 입력
  const now = new Date();
  const updateTime = now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  await page.type(editorSelector, `마지막 업데이트: ${updateTime}\n`);
  await page.type(editorSelector, `총 휴가 건수: ${vacationData.length}건\n\n`);

  // 변경사항 요약
  if (changes.added.length > 0 || changes.modified.length > 0 || changes.removed.length > 0) {
    await page.type(editorSelector, '📢 변경사항\n');
    if (changes.added.length > 0) {
      await page.type(editorSelector, `• 새로운 휴가: ${changes.added.length}건\n`);
    }
    if (changes.modified.length > 0) {
      await page.type(editorSelector, `• 변경된 휴가: ${changes.modified.length}건\n`);
    }
    if (changes.removed.length > 0) {
      await page.type(editorSelector, `• 취소된 휴가: ${changes.removed.length}건\n`);
    }
    await page.type(editorSelector, '\n');
  }

  // 휴가 테이블 추가
  await page.type(editorSelector, '팀원 휴가 현황\n\n');

  // 테이블 마크다운 입력
  const tableMarkdown = formatVacationDataAsTable(vacationData);
  await page.type(editorSelector, tableMarkdown);

  await page.type(editorSelector, '\n\n---\n');
  await page.type(editorSelector, '이 페이지는 자동으로 업데이트됩니다.\n');

  console.log('  ✓ 새 내용 입력 완료');
}

/**
 * 기존 Confluence 에디터에서 내용 업데이트
 *
 * @param {import('playwright').Page} page - Playwright 페이지 객체
 * @param {Array} vacationData - 휴가 데이터
 * @param {Object} changes - 변경사항
 */
async function updateWithLegacyEditor(page, vacationData, changes) {
  // iframe 내부의 에디터 찾기
  const frameElement = await page.$('iframe#wysiwygTextarea, iframe.editor-iframe');

  if (frameElement) {
    const frame = await frameElement.contentFrame();
    const bodySelector = 'body#tinymce';

    await frame.waitForSelector(bodySelector, { timeout: 10000 });

    // 기존 내용 삭제
    await frame.click(bodySelector);
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');

    console.log('  - 기존 내용 삭제 완료');

    // 새 내용 입력
    const now = new Date();
    const updateTime = now.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

    await frame.type(bodySelector, `마지막 업데이트: ${updateTime}\n`);
    await frame.type(bodySelector, `총 휴가 건수: ${vacationData.length}건\n\n`);

    // 변경사항
    if (changes.added.length > 0 || changes.modified.length > 0 || changes.removed.length > 0) {
      await frame.type(bodySelector, '변경사항\n');
      if (changes.added.length > 0) {
        await frame.type(bodySelector, `- 새로운 휴가: ${changes.added.length}건\n`);
      }
      if (changes.modified.length > 0) {
        await frame.type(bodySelector, `- 변경된 휴가: ${changes.modified.length}건\n`);
      }
      if (changes.removed.length > 0) {
        await frame.type(bodySelector, `- 취소된 휴가: ${changes.removed.length}건\n`);
      }
      await frame.type(bodySelector, '\n');
    }

    // 휴가 데이터
    const textData = formatVacationDataAsText(vacationData);
    await frame.type(bodySelector, textData);

    console.log('  ✓ 새 내용 입력 완료');
  } else {
    throw new Error('Confluence 에디터를 찾을 수 없습니다.');
  }
}

/**
 * Confluence 페이지 업데이트 (기존 브라우저 세션 재사용)
 * 메인 자동화 스크립트에서 이미 열려있는 브라우저를 재사용합니다.
 *
 * @param {import('playwright').Page} page - 기존 Playwright 페이지 객체
 * @param {Array} vacationData - 업데이트할 휴가 데이터
 * @param {Object} changes - 변경사항
 */
export async function updateConfluencePageWithExistingBrowser(page, vacationData, changes) {
  try {
    console.log('  - Confluence 페이지 업데이트 시작...');

    // Confluence 페이지로 이동
    console.log('  - Confluence 페이지로 이동 중...');
    await page.goto(process.env.CONFLUENCE_PAGE_URL, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // 로그인 필요 여부 확인
    const needsLogin = await page.evaluate(() => {
      return document.querySelector('#user-menu-link, [data-test-id="user-menu"]') === null;
    });

    if (needsLogin) {
      await waitForConfluenceLogin(page);
      await page.goto(process.env.CONFLUENCE_PAGE_URL, { waitUntil: 'networkidle' });
    }

    // 편집 모드로 전환
    console.log('  - 편집 모드로 전환 중...');
    await page.click('button:has-text("편집"), button:has-text("Edit")');
    await page.waitForTimeout(3000);

    // 에디터 타입에 따라 업데이트
    const isNewEditor = await page.$('[data-test-id="fabric-editor-container"]') !== null;

    if (isNewEditor) {
      await updateWithNewEditor(page, vacationData, changes);
    } else {
      await updateWithLegacyEditor(page, vacationData, changes);
    }

    // 저장
    await page.click('button:has-text("게시"), button:has-text("Publish")');
    await page.waitForTimeout(3000);

    console.log('  ✓ Confluence 페이지 업데이트 완료');

  } catch (error) {
    console.error('  ❌ Confluence 업데이트 실패:', error.message);
    throw error;
  }
}
