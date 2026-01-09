/**
 * 선택자 찾기 도우미 스크립트
 *
 * 이 스크립트는 웹페이지의 요소를 찾는데 도움을 줍니다.
 * 실제 웹사이트 구조를 파악하는데 사용하세요.
 *
 * 사용법:
 * 1. .env 파일에서 COMPANY_LOGIN_URL과 로그인 정보 설정
 * 2. node examples/selector-finder.js 실행
 * 3. 브라우저가 열리면 콘솔에서 선택자 정보 확인
 */

import { chromium } from 'playwright';
import dotenv from 'dotenv';

dotenv.config();

async function findSelectors() {
  const browser = await chromium.launch({
    headless: false, // 브라우저를 볼 수 있게
    slowMo: 500,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 로그인 페이지로 이동
    console.log('로그인 페이지로 이동 중...');
    await page.goto(process.env.COMPANY_LOGIN_URL);

    console.log('\n=== 페이지 분석 시작 ===\n');

    // 입력 필드 찾기
    console.log('📝 입력 필드 (input):');
    const inputs = await page.$$('input');
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const type = await input.getAttribute('type');
      const name = await input.getAttribute('name');
      const id = await input.getAttribute('id');
      const placeholder = await input.getAttribute('placeholder');

      console.log(`  Input ${i + 1}:`);
      if (id) console.log(`    ID: #${id}`);
      if (name) console.log(`    Name: input[name="${name}"]`);
      if (type) console.log(`    Type: ${type}`);
      if (placeholder) console.log(`    Placeholder: "${placeholder}"`);
      console.log('');
    }

    // 버튼 찾기
    console.log('🔘 버튼 (button):');
    const buttons = await page.$$('button');
    for (let i = 0; i < buttons.length; i++) {
      const button = buttons[i];
      const text = await button.textContent();
      const type = await button.getAttribute('type');
      const id = await button.getAttribute('id');
      const className = await button.getAttribute('class');

      console.log(`  Button ${i + 1}:`);
      if (text) console.log(`    Text: "${text.trim()}"`);
      if (id) console.log(`    ID: #${id}`);
      if (className) console.log(`    Class: .${className.split(' ')[0]}`);
      if (type) console.log(`    Type: ${type}`);
      console.log('');
    }

    // 폼 찾기
    console.log('📋 폼 (form):');
    const forms = await page.$$('form');
    for (let i = 0; i < forms.length; i++) {
      const form = forms[i];
      const name = await form.getAttribute('name');
      const id = await form.getAttribute('id');
      const action = await form.getAttribute('action');

      console.log(`  Form ${i + 1}:`);
      if (id) console.log(`    ID: #${id}`);
      if (name) console.log(`    Name: form[name="${name}"]`);
      if (action) console.log(`    Action: ${action}`);
      console.log('');
    }

    // 링크 찾기
    console.log('🔗 링크 (a):');
    const links = await page.$$('a');
    for (let i = 0; i < Math.min(links.length, 10); i++) { // 처음 10개만
      const link = links[i];
      const text = await link.textContent();
      const href = await link.getAttribute('href');

      if (text && text.trim()) {
        console.log(`  Link ${i + 1}: "${text.trim()}" → ${href}`);
      }
    }

    console.log('\n=== 분석 완료 ===');
    console.log('\n💡 이제 auth.js에서 올바른 선택자를 사용하세요!');
    console.log('\n브라우저를 닫으려면 Ctrl+C를 누르세요.');
    console.log('브라우저가 30초 동안 열려있습니다...');

    // 30초 대기 (페이지 확인 시간)
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('오류 발생:', error.message);
  } finally {
    await browser.close();
  }
}

findSelectors();
