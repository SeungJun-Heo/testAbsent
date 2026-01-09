/**
 * 휴가 페이지 구조 분석 스크립트
 *
 * 이 스크립트는 휴가 현황 페이지의 구조를 분석하여
 * 데이터 파싱에 필요한 선택자를 찾아줍니다.
 *
 * 사용법:
 * 1. .env 파일 설정
 * 2. node examples/vacation-page-analyzer.js 실행
 * 3. 콘솔에서 테이블 구조 확인
 */

import { chromium } from 'playwright';
import dotenv from 'dotenv';

dotenv.config();

async function analyzeVacationPage() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500,
  });

  const page = await browser.newPage();

  try {
    console.log('로그인 페이지로 이동 중...');
    await page.goto(process.env.COMPANY_LOGIN_URL);

    // 로그인 (수동으로 하거나 자동으로)
    console.log('\n⚠️  수동으로 로그인해주세요. 10초 대기...');
    await page.waitForTimeout(10000);

    console.log('\n휴가 페이지로 이동 중...');
    await page.goto(process.env.VACATION_PAGE_URL);
    await page.waitForLoadState('networkidle');

    console.log('\n=== 페이지 구조 분석 ===\n');

    // 테이블 찾기
    console.log('📊 테이블 구조:');
    const tables = await page.$$('table');

    if (tables.length === 0) {
      console.log('  ⚠️  테이블을 찾을 수 없습니다.');
      console.log('  다른 구조일 수 있습니다. div, ul, 또는 다른 요소를 확인하세요.');
    } else {
      for (let i = 0; i < tables.length; i++) {
        console.log(`\n테이블 ${i + 1}:`);

        // 테이블 헤더
        const headers = await tables[i].$$('th');
        if (headers.length > 0) {
          console.log('  헤더:');
          for (const header of headers) {
            const text = await header.textContent();
            console.log(`    - ${text.trim()}`);
          }
        }

        // 첫 번째 데이터 행 분석
        const firstRow = await tables[i].$('tbody tr');
        if (firstRow) {
          const cells = await firstRow.$$('td');
          console.log(`  데이터 셀 개수: ${cells.length}`);
          console.log('  첫 번째 행 데이터:');
          for (let j = 0; j < cells.length; j++) {
            const text = await cells[j].textContent();
            console.log(`    셀 ${j + 1}: "${text.trim()}"`);
          }
        }

        // 행 개수
        const rows = await tables[i].$$('tbody tr');
        console.log(`  전체 행 개수: ${rows.length}`);
      }
    }

    // div 기반 구조 찾기
    console.log('\n\n📦 DIV 기반 구조:');

    // 일반적인 클래스 이름들
    const commonClasses = [
      '.vacation-list',
      '.vacation-table',
      '.vacation-row',
      '.vacation-item',
      '.leave-list',
      '.leave-table',
      '.list-item',
      '.data-row',
      '.table-row',
    ];

    for (const selector of commonClasses) {
      const elements = await page.$$(selector);
      if (elements.length > 0) {
        console.log(`  ✓ 찾음: ${selector} (${elements.length}개)`);

        // 첫 번째 요소의 내용
        if (elements[0]) {
          const text = await elements[0].textContent();
          console.log(`    샘플: "${text.trim().substring(0, 100)}..."`);
        }
      }
    }

    // 페이지의 모든 텍스트 추출 (샘플)
    console.log('\n\n📄 페이지 내용 샘플:');
    const bodyText = await page.$eval('body', el => el.textContent);
    const lines = bodyText.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .slice(0, 20); // 처음 20줄만

    lines.forEach((line, i) => {
      console.log(`  ${i + 1}. ${line.substring(0, 80)}${line.length > 80 ? '...' : ''}`);
    });

    // HTML 구조를 파일로 저장
    const html = await page.content();
    const fs = await import('fs/promises');
    await fs.writeFile('vacation-page-structure.html', html);
    console.log('\n💾 페이지 HTML이 vacation-page-structure.html에 저장되었습니다.');

    // 스크린샷 저장
    await page.screenshot({ path: 'vacation-page-screenshot.png', fullPage: true });
    console.log('📸 스크린샷이 vacation-page-screenshot.png에 저장되었습니다.');

    console.log('\n=== 분석 완료 ===');
    console.log('\n💡 vacation.js에서 올바른 선택자를 사용하세요!');
    console.log('브라우저를 닫으려면 Ctrl+C를 누르세요.');
    console.log('브라우저가 30초 동안 열려있습니다...');

    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('오류 발생:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
}

analyzeVacationPage();
