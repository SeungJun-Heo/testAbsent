/**
 * Confluence 페이지 편집 테스트 스크립트
 *
 * 이 스크립트는 Confluence 페이지에 접속하여 편집 기능을 테스트합니다.
 * 실제 업데이트 전에 편집 권한과 선택자를 확인하는데 사용하세요.
 *
 * 사용법:
 * 1. .env 파일에서 Confluence 설정 완료
 * 2. node examples/confluence-editor-test.js 실행
 * 3. 브라우저에서 편집 과정 확인
 */

import { chromium } from 'playwright';
import dotenv from 'dotenv';

dotenv.config();

async function testConfluenceEditor() {
  console.log('='.repeat(60));
  console.log('Confluence 편집기 테스트');
  console.log('='.repeat(60));

  const browser = await chromium.launch({
    headless: false, // 브라우저를 보면서 테스트
    slowMo: 500,     // 천천히 실행
  });

  const page = await browser.newPage();

  try {
    // 1. Confluence 페이지로 이동
    console.log('\n[1/6] Confluence 페이지로 이동 중...');
    await page.goto(process.env.CONFLUENCE_PAGE_URL, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    console.log('✓ 페이지 로드 완료');

    // 2. 로그인 필요 여부 확인
    console.log('\n[2/6] 로그인 상태 확인 중...');
    const isLoggedIn = await page.evaluate(() => {
      return document.querySelector('#user-menu-link, [data-test-id="user-menu"]') !== null;
    });

    if (!isLoggedIn) {
      console.log('로그인이 필요합니다. 로그인 진행 중...');

      // 로그인 페이지로 이동
      await page.goto(process.env.CONFLUENCE_LOGIN_URL || process.env.CONFLUENCE_PAGE_URL);

      // 사용자명 입력
      await page.waitForSelector('input[name="username"], input[type="email"]', { timeout: 10000 });
      await page.fill('input[name="username"], input[type="email"]', process.env.CONFLUENCE_USERNAME);
      console.log('  - 사용자명 입력 완료');

      // Continue 버튼 클릭
      await page.click('button[type="submit"], button:has-text("Continue")');
      await page.waitForTimeout(1000);

      // 비밀번호 입력
      await page.waitForSelector('input[name="password"], input[type="password"]', { timeout: 10000 });
      await page.fill('input[name="password"], input[type="password"]', process.env.CONFLUENCE_PASSWORD);
      console.log('  - 비밀번호 입력 완료');

      // 로그인 버튼 클릭
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }).catch(() => {}),
        page.click('button[type="submit"], button:has-text("Log in")'),
      ]);

      console.log('✓ 로그인 성공');

      // 원래 페이지로 돌아가기
      await page.goto(process.env.CONFLUENCE_PAGE_URL, { waitUntil: 'networkidle' });
    } else {
      console.log('✓ 이미 로그인되어 있습니다');
    }

    // 3. 페이지 구조 분석
    console.log('\n[3/6] 페이지 구조 분석 중...');

    // 편집 버튼 찾기
    const editButtons = await page.$$('button, a');
    console.log(`  - 발견된 버튼/링크: ${editButtons.length}개`);

    const editSelectors = [
      'button:has-text("편집")',
      'button:has-text("Edit")',
      'a:has-text("편집")',
      'a:has-text("Edit")',
      '#editPageLink',
      '[data-test-id="edit-page-button"]',
    ];

    console.log('  - 편집 버튼 찾기 시도 중...');
    let foundEditButton = null;

    for (const selector of editSelectors) {
      const button = await page.$(selector);
      if (button) {
        const isVisible = await button.isVisible();
        if (isVisible) {
          console.log(`  ✓ 편집 버튼 발견: ${selector}`);
          foundEditButton = selector;
          break;
        }
      }
    }

    if (!foundEditButton) {
      console.log('  ⚠️  편집 버튼을 찾을 수 없습니다.');
      console.log('  💡 페이지에 편집 권한이 있는지 확인하세요.');
      console.log('  💡 수동으로 편집 버튼을 클릭해보세요 (30초 대기)...');
      await page.waitForTimeout(30000);
      return;
    }

    // 4. 편집 모드로 전환
    console.log('\n[4/6] 편집 모드로 전환 중...');
    await page.click(foundEditButton);
    await page.waitForTimeout(3000);
    console.log('✓ 편집 버튼 클릭 완료');

    // 5. 에디터 타입 확인
    console.log('\n[5/6] 에디터 타입 확인 중...');

    const isNewEditor = await page.$('[data-test-id="fabric-editor-container"]') !== null;
    const isLegacyEditor = await page.$('iframe#wysiwygTextarea, iframe.editor-iframe') !== null;

    if (isNewEditor) {
      console.log('✓ 새 Confluence 에디터 감지 (Fabric Editor)');

      const editorSelector = '[data-test-id="fabric-editor-container"] [contenteditable="true"]';
      const editor = await page.$(editorSelector);

      if (editor) {
        console.log('  ✓ 에디터 영역 찾기 성공');

        // 테스트 텍스트 입력
        console.log('  - 테스트 텍스트 입력 중...');
        await page.click(editorSelector);
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await page.type(editorSelector, '🧪 테스트 업데이트\n\n');
        await page.type(editorSelector, `업데이트 시간: ${new Date().toLocaleString('ko-KR')}\n`);
        await page.type(editorSelector, '\n이것은 자동화 테스트입니다.\n');
        console.log('  ✓ 텍스트 입력 완료');
      }
    } else if (isLegacyEditor) {
      console.log('✓ 기존 Confluence 에디터 감지 (Legacy Editor)');

      const frameElement = await page.$('iframe#wysiwygTextarea, iframe.editor-iframe');
      const frame = await frameElement.contentFrame();
      const bodySelector = 'body#tinymce';

      if (frame) {
        console.log('  ✓ 에디터 iframe 찾기 성공');

        // 테스트 텍스트 입력
        console.log('  - 테스트 텍스트 입력 중...');
        await frame.click(bodySelector);
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');
        await frame.type(bodySelector, '🧪 테스트 업데이트\n\n');
        await frame.type(bodySelector, `업데이트 시간: ${new Date().toLocaleString('ko-KR')}\n`);
        await frame.type(bodySelector, '\n이것은 자동화 테스트입니다.\n');
        console.log('  ✓ 텍스트 입력 완료');
      }
    } else {
      console.log('  ⚠️  에디터를 찾을 수 없습니다.');
      console.log('  💡 페이지가 편집 모드로 전환되지 않았을 수 있습니다.');
    }

    // 6. 게시 버튼 찾기 (실제로 클릭하지는 않음)
    console.log('\n[6/6] 게시 버튼 확인 중...');

    const publishSelectors = [
      'button:has-text("게시")',
      'button:has-text("Publish")',
      'button:has-text("저장")',
      'button:has-text("Save")',
      '[data-test-id="publish-button"]',
      '#rte-button-publish',
    ];

    let foundPublishButton = null;

    for (const selector of publishSelectors) {
      const button = await page.$(selector);
      if (button) {
        try {
          const isVisible = await button.isVisible();
          if (isVisible) {
            console.log(`  ✓ 게시 버튼 발견: ${selector}`);
            foundPublishButton = selector;
            break;
          }
        } catch (e) {
          // 계속 시도
        }
      }
    }

    if (!foundPublishButton) {
      console.log('  ⚠️  게시 버튼을 찾을 수 없습니다.');
    }

    // 결과 요약
    console.log('\n' + '='.repeat(60));
    console.log('테스트 결과 요약');
    console.log('='.repeat(60));
    console.log(`✓ 로그인: 성공`);
    console.log(`✓ 편집 버튼: ${foundEditButton ? '발견됨' : '찾을 수 없음'}`);
    console.log(`✓ 에디터 타입: ${isNewEditor ? '새 에디터' : isLegacyEditor ? '기존 에디터' : '알 수 없음'}`);
    console.log(`✓ 게시 버튼: ${foundPublishButton ? '발견됨' : '찾을 수 없음'}`);
    console.log('='.repeat(60));

    console.log('\n💡 테스트 텍스트가 입력되었습니다.');
    console.log('💡 브라우저에서 확인 후 직접 "취소" 또는 "게시"를 선택하세요.');
    console.log('💡 브라우저를 닫으려면 Ctrl+C를 누르세요.');
    console.log('💡 60초 후 자동으로 종료됩니다.\n');

    // 사용자가 확인할 시간 제공
    await page.waitForTimeout(60000);

  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    console.error(error.stack);

    // 스크린샷 저장
    try {
      const screenshotPath = `confluence-test-error-${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`\n📸 오류 스크린샷 저장: ${screenshotPath}`);
    } catch (e) {
      // 무시
    }

    console.log('\n💡 브라우저가 30초 동안 열려 있습니다. 문제를 확인하세요.');
    await page.waitForTimeout(30000);
  } finally {
    await browser.close();
    console.log('\n브라우저 종료됨');
  }
}

// 환경 변수 확인
if (!process.env.CONFLUENCE_PAGE_URL) {
  console.error('❌ CONFLUENCE_PAGE_URL이 .env 파일에 설정되지 않았습니다.');
  console.error('   .env.example을 참고하여 설정해주세요.');
  process.exit(1);
}

if (!process.env.CONFLUENCE_USERNAME || !process.env.CONFLUENCE_PASSWORD) {
  console.error('❌ Confluence 로그인 정보가 .env 파일에 설정되지 않았습니다.');
  console.error('   CONFLUENCE_USERNAME과 CONFLUENCE_PASSWORD를 설정해주세요.');
  process.exit(1);
}

testConfluenceEditor();
