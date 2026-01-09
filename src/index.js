/**
 * 팀원 휴가 현황 자동화 메인 스크립트
 *
 * 이 스크립트는 다음 작업을 수행합니다:
 * 1. 회사 시스템에 로그인
 * 2. 휴가 현황 페이지에서 데이터 수집
 * 3. JSON 형식으로 데이터 저장
 * 4. Confluence 페이지 업데이트
 */

import { chromium } from 'playwright';
import cron from 'node-cron';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { waitForLogin } from './modules/auth.js';
import { navigateToVacationPage, parseVacationData } from './modules/vacation.js';
import { updateConfluencePage } from './modules/confluence.js';
import { compareVacationData, saveVacationData, loadPreviousData } from './modules/dataManager.js';

// ES Module에서 __dirname 사용을 위한 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 환경 변수 로드
dotenv.config();

/**
 * 메인 자동화 함수
 * Playwright 브라우저를 실행하고 전체 워크플로우를 수행합니다.
 *
 * @param {boolean} dryRun - true일 경우 Confluence 업데이트 없이 데이터만 수집
 */
async function runAutomation(dryRun = false) {
  console.log('='.repeat(60));
  console.log('팀원 휴가 현황 자동화 시작:', new Date().toLocaleString('ko-KR'));
  console.log('='.repeat(60));

  // Playwright 브라우저 인스턴스
  let browser = null;
  let context = null;
  let page = null;

  try {
    // 1. 브라우저 실행
    // Selenium의 webdriver.Chrome()과 유사한 역할
    console.log('\n[1/6] 브라우저 실행 중...');

    // Remote Browser 지원 (WSL에서 Windows Chrome 사용)
    if (process.env.CHROME_REMOTE_DEBUGGING_URL) {
      console.log(`  - Remote Chrome 연결: ${process.env.CHROME_REMOTE_DEBUGGING_URL}`);
      browser = await chromium.connectOverCDP(process.env.CHROME_REMOTE_DEBUGGING_URL);
      console.log('  ✓ Windows Chrome에 연결됨');
    } else {
      browser = await chromium.launch({
        headless: process.env.HEADLESS === 'true', // headless 모드 설정
        slowMo: 100, // 각 작업 사이 100ms 지연 (디버깅에 유용)
      });
    }

    // 세션 저장/복원 설정
    const useSavedSession = process.env.USE_SAVED_SESSION === 'true';
    const sessionFile = process.env.SESSION_FILE || './auth-state.json';
    let storageState = undefined;

    if (useSavedSession) {
      try {
        await fs.access(sessionFile);
        storageState = sessionFile;
        console.log(`  ✓ 저장된 세션 로드: ${sessionFile}`);
      } catch (e) {
        console.log('  - 저장된 세션 없음. 새로 로그인이 필요합니다.');
      }
    }

    // 브라우저 컨텍스트 생성 (독립적인 세션, Selenium의 driver와 유사)
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      storageState, // 저장된 세션 사용 (있는 경우)
    });

    // 새 페이지 생성
    page = await context.newPage();

    // 타임아웃 설정 (Selenium의 implicitly_wait와 유사)
    page.setDefaultTimeout(parseInt(process.env.BROWSER_TIMEOUT) || 30000);

    // 2. 로그인 상태 확인 (재시도 포함)
    console.log('\n[2/6] 로그인 상태 확인 중...');
    const isLoggedIn = await waitForLogin(page);

    if (!isLoggedIn) {
      throw new Error('로그인 실패: 최대 대기 시간 초과');
    }

    // 3. 휴가 현황 페이지로 이동
    console.log('\n[3/6] 휴가 현황 페이지로 이동 중...');
    await navigateToVacationPage(page);
    console.log('✓ 페이지 이동 완료');

    // 4. 휴가 데이터 파싱
    console.log('\n[4/6] 휴가 데이터 파싱 중...');
    const vacationData = await parseVacationData(page);
    console.log(`✓ ${vacationData.length}명의 휴가 정보 수집 완료`);

    // 5. 데이터 저장 및 변경사항 확인
    console.log('\n[5/6] 데이터 저장 및 비교 중...');
    const previousData = await loadPreviousData();
    const changes = compareVacationData(previousData, vacationData);
    await saveVacationData(vacationData);

    console.log(`✓ 데이터 저장 완료`);
    console.log(`  - 새로운 휴가: ${changes.added.length}건`);
    console.log(`  - 변경된 휴가: ${changes.modified.length}건`);
    console.log(`  - 삭제된 휴가: ${changes.removed.length}건`);

    // 6. Confluence 페이지 업데이트
    if (!dryRun && (changes.added.length > 0 || changes.modified.length > 0 || changes.removed.length > 0)) {
      console.log('\n[6/6] Confluence 페이지 업데이트 중...');
      await updateConfluencePage(vacationData, changes);
      console.log('✓ Confluence 업데이트 완료');
    } else if (dryRun) {
      console.log('\n[6/6] DRY RUN 모드: Confluence 업데이트 건너뜀');
    } else {
      console.log('\n[6/6] 변경사항 없음: Confluence 업데이트 건너뜀');
    }

    console.log('\n' + '='.repeat(60));
    console.log('자동화 완료:', new Date().toLocaleString('ko-KR'));
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    console.error(error.stack);

    // 오류 발생 시 스크린샷 저장
    if (page) {
      try {
        const screenshotPath = path.join(process.env.DATA_DIR || './data', `error-${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`스크린샷 저장됨: ${screenshotPath}`);
      } catch (screenshotError) {
        console.error('스크린샷 저장 실패:', screenshotError.message);
      }
    }

    throw error;
  } finally {
    // 브라우저 리소스 정리 (Selenium의 driver.quit()과 유사)
    if (browser) {
      await browser.close();
      console.log('브라우저 종료됨');
    }
  }
}

/**
 * 스케줄러 설정
 * node-cron을 사용하여 특정 시간에 자동 실행
 */
function setupScheduler() {
  const schedule = process.env.CRON_SCHEDULE || '0 9 * * 1-5'; // 기본: 평일 오전 9시

  console.log(`스케줄러 설정: ${schedule}`);
  console.log('다음 형식으로 설정되어 있습니다:');
  console.log('  분 시 일 월 요일');
  console.log('  예: "0 9 * * 1-5" = 평일(월-금) 오전 9시\n');

  cron.schedule(schedule, async () => {
    console.log('\n⏰ 스케줄 실행 시작');
    try {
      await runAutomation();
    } catch (error) {
      console.error('스케줄 실행 중 오류:', error);
    }
  });

  console.log('✓ 스케줄러가 활성화되었습니다.');
  console.log('  프로그램이 백그라운드에서 실행되며, 예정된 시간에 자동으로 동작합니다.\n');
}

/**
 * 애플리케이션 시작점
 */
async function main() {
  // 데이터 디렉토리 생성
  const dataDir = process.env.DATA_DIR || './data';
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (error) {
    // 디렉토리가 이미 존재하는 경우 무시
  }

  // 커맨드 라인 인자 확인
  const args = process.argv.slice(2);

  if (args.includes('--dry-run') || args.includes('--test')) {
    // 테스트 모드: 즉시 실행 (Confluence 업데이트 없음)
    console.log('🧪 테스트 모드로 실행합니다.\n');
    await runAutomation(true);
  } else if (args.includes('--once')) {
    // 1회 실행 모드
    console.log('▶️  1회 실행 모드\n');
    await runAutomation(false);
  } else {
    // 스케줄 모드
    console.log('📅 스케줄 모드로 시작합니다.\n');
    setupScheduler();

    // 프로그램이 종료되지 않도록 유지
    console.log('종료하려면 Ctrl+C를 누르세요.\n');
  }
}

// 프로그램 실행
main().catch(error => {
  console.error('프로그램 실행 중 치명적 오류:', error);
  process.exit(1);
});
