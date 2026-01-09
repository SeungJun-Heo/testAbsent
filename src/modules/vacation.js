/**
 * 휴가 정보 수집 모듈
 * 휴가 현황 페이지 탐색 및 데이터 파싱
 */

import dotenv from 'dotenv';
dotenv.config();

/**
 * 휴가 현황 페이지로 이동하고 필요한 클릭 작업 수행
 *
 * Selenium 비교:
 * - Selenium: driver.get(url), driver.find_element().click()
 * - Playwright: page.goto(url), page.click()
 *
 * @param {import('playwright').Page} page - Playwright 페이지 객체
 */
export async function navigateToVacationPage(page) {
  try {
    // 1. 휴가 페이지로 이동
    await page.goto(process.env.VACATION_PAGE_URL, {
      waitUntil: 'domcontentloaded',
    });

    console.log('  - 기본 페이지 로드 완료');

    // 2. 필요한 클릭 작업 수행 (예: 메뉴 클릭, 탭 전환 등)
    // 실제 웹사이트 구조에 맞게 수정 필요

    // 예제 1: 특정 메뉴 클릭
    // await page.click('nav a:has-text("휴가관리")');
    // await page.waitForLoadState('networkidle');

    // 예제 2: 드롭다운 선택
    // await page.selectOption('select[name="department"]', '개발팀');

    // 예제 3: 날짜 범위 설정 (이번 달)
    // const today = new Date();
    // const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    // const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    // await page.fill('input[name="startDate"]', firstDay.toISOString().split('T')[0]);
    // await page.fill('input[name="endDate"]', lastDay.toISOString().split('T')[0]);

    // 예제 4: 조회 버튼 클릭
    // await page.click('button:has-text("조회")');
    // await page.waitForSelector('.vacation-table', { timeout: 10000 });

    console.log('  - 페이지 탐색 완료');

  } catch (error) {
    console.error('페이지 탐색 중 오류:', error.message);
    throw error;
  }
}

/**
 * 페이지에서 휴가 데이터 파싱
 *
 * Selenium 비교:
 * - Selenium: elements = driver.find_elements(By.CSS_SELECTOR, ".row")
 * - Playwright: elements = await page.$$('.row')
 *
 * Playwright의 주요 선택자 메서드:
 * - page.$('selector') : 단일 요소 (Selenium의 find_element)
 * - page.$$('selector') : 여러 요소 (Selenium의 find_elements)
 * - page.locator('selector') : 더 강력한 선택자 API
 *
 * @param {import('playwright').Page} page - Playwright 페이지 객체
 * @returns {Promise<Array>} 파싱된 휴가 데이터 배열
 */
export async function parseVacationData(page) {
  try {
    // 데이터가 로드될 때까지 대기
    // await page.waitForSelector('.vacation-list', { timeout: 10000 }); // 실제 선택자로 변경

    // 방법 1: page.$$eval을 사용한 데이터 추출
    // DOM 내에서 직접 JavaScript 실행 (빠르지만 복잡한 로직에는 제한적)
    const vacationData = await page.$$eval('.vacation-row', rows => {
      // 이 함수는 브라우저 컨텍스트에서 실행됩니다
      return rows.map(row => {
        return {
          employeeName: row.querySelector('.employee-name')?.textContent?.trim() || '',
          department: row.querySelector('.department')?.textContent?.trim() || '',
          vacationType: row.querySelector('.vacation-type')?.textContent?.trim() || '',
          startDate: row.querySelector('.start-date')?.textContent?.trim() || '',
          endDate: row.querySelector('.end-date')?.textContent?.trim() || '',
          days: parseFloat(row.querySelector('.days')?.textContent?.trim() || '0'),
          status: row.querySelector('.status')?.textContent?.trim() || '',
        };
      });
    });

    // 방법 2: locator와 반복문을 사용한 데이터 추출
    // 더 복잡한 로직이 필요할 때 유용
    /*
    const rows = await page.locator('.vacation-row').all();
    const vacationData = [];

    for (const row of rows) {
      const data = {
        employeeName: await row.locator('.employee-name').textContent(),
        department: await row.locator('.department').textContent(),
        vacationType: await row.locator('.vacation-type').textContent(),
        startDate: await row.locator('.start-date').textContent(),
        endDate: await row.locator('.end-date').textContent(),
        days: parseFloat(await row.locator('.days').textContent()),
        status: await row.locator('.status').textContent(),
      };
      vacationData.push(data);
    }
    */

    // 방법 3: 테이블 데이터 파싱 예제
    /*
    const vacationData = await page.evaluate(() => {
      const table = document.querySelector('table.vacation-table');
      const rows = Array.from(table.querySelectorAll('tbody tr'));

      return rows.map(row => {
        const cells = row.querySelectorAll('td');
        return {
          employeeName: cells[0]?.textContent?.trim() || '',
          department: cells[1]?.textContent?.trim() || '',
          vacationType: cells[2]?.textContent?.trim() || '',
          startDate: cells[3]?.textContent?.trim() || '',
          endDate: cells[4]?.textContent?.trim() || '',
          days: parseFloat(cells[5]?.textContent?.trim() || '0'),
          status: cells[6]?.textContent?.trim() || '',
        };
      });
    });
    */

    // 데이터 검증
    console.log(`  - 총 ${vacationData.length}개의 휴가 정보 파싱`);

    // 샘플 데이터 출력 (디버깅용)
    if (vacationData.length > 0) {
      console.log('  - 샘플 데이터:', JSON.stringify(vacationData[0], null, 2));
    }

    return vacationData;

  } catch (error) {
    console.error('데이터 파싱 중 오류:', error.message);
    throw error;
  }
}

/**
 * 여러 페이지에 걸쳐 데이터 수집 (페이지네이션)
 *
 * @param {import('playwright').Page} page - Playwright 페이지 객체
 * @returns {Promise<Array>} 모든 페이지의 휴가 데이터
 */
export async function parseAllPages(page) {
  const allData = [];
  let currentPage = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    console.log(`  - 페이지 ${currentPage} 파싱 중...`);

    // 현재 페이지 데이터 수집
    const pageData = await parseVacationData(page);
    allData.push(...pageData);

    // 다음 페이지 버튼 확인
    const nextButton = await page.$('button.next-page:not([disabled])');

    if (nextButton) {
      await nextButton.click();
      await page.waitForLoadState('networkidle');
      currentPage++;
    } else {
      hasNextPage = false;
    }
  }

  console.log(`  - 총 ${currentPage}페이지에서 ${allData.length}건의 데이터 수집`);
  return allData;
}
