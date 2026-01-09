/**
 * 데이터 관리 모듈
 * 휴가 데이터 저장, 로드, 비교
 */

import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const DATA_DIR = process.env.DATA_DIR || './data';
const CURRENT_DATA_FILE = path.join(DATA_DIR, 'vacation-current.json');
const HISTORY_DIR = path.join(DATA_DIR, 'history');

/**
 * 휴가 데이터를 JSON 파일로 저장
 *
 * @param {Array} vacationData - 저장할 휴가 데이터
 */
export async function saveVacationData(vacationData) {
  try {
    // 히스토리 디렉토리 생성
    await fs.mkdir(HISTORY_DIR, { recursive: true });

    // 현재 데이터 저장
    await fs.writeFile(
      CURRENT_DATA_FILE,
      JSON.stringify(vacationData, null, 2),
      'utf-8'
    );

    // 히스토리에 타임스탬프와 함께 저장
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const historyFile = path.join(HISTORY_DIR, `vacation-${timestamp}.json`);
    await fs.writeFile(
      historyFile,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        data: vacationData,
      }, null, 2),
      'utf-8'
    );

    console.log(`  ✓ 데이터 저장: ${CURRENT_DATA_FILE}`);
    console.log(`  ✓ 히스토리 저장: ${historyFile}`);

  } catch (error) {
    console.error('데이터 저장 실패:', error.message);
    throw error;
  }
}

/**
 * 이전 휴가 데이터 로드
 *
 * @returns {Promise<Array>} 이전 휴가 데이터, 없으면 빈 배열
 */
export async function loadPreviousData() {
  try {
    const data = await fs.readFile(CURRENT_DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // 파일이 없으면 빈 배열 반환
      return [];
    }
    console.error('이전 데이터 로드 실패:', error.message);
    return [];
  }
}

/**
 * 두 휴가 데이터 세트를 비교하여 변경사항 추출
 *
 * @param {Array} previousData - 이전 데이터
 * @param {Array} currentData - 현재 데이터
 * @returns {Object} 변경사항 (added, modified, removed)
 */
export function compareVacationData(previousData, currentData) {
  const changes = {
    added: [],      // 새로 추가된 휴가
    modified: [],   // 변경된 휴가
    removed: [],    // 삭제된 휴가
  };

  // 데이터를 키로 매핑 (비교를 위해)
  // 키 생성: 이름 + 시작일로 고유 식별
  const createKey = (item) => `${item.employeeName}-${item.startDate}`;

  const previousMap = new Map(
    previousData.map(item => [createKey(item), item])
  );
  const currentMap = new Map(
    currentData.map(item => [createKey(item), item])
  );

  // 새로 추가되거나 변경된 항목 찾기
  for (const [key, currentItem] of currentMap) {
    const previousItem = previousMap.get(key);

    if (!previousItem) {
      // 새로운 휴가
      changes.added.push(currentItem);
    } else {
      // 기존 항목이 변경되었는지 확인
      if (JSON.stringify(previousItem) !== JSON.stringify(currentItem)) {
        changes.modified.push({
          before: previousItem,
          after: currentItem,
        });
      }
    }
  }

  // 삭제된 항목 찾기
  for (const [key, previousItem] of previousMap) {
    if (!currentMap.has(key)) {
      changes.removed.push(previousItem);
    }
  }

  return changes;
}

/**
 * 변경사항을 사람이 읽기 쉬운 형식으로 포맷
 *
 * @param {Object} changes - compareVacationData의 반환값
 * @returns {string} 포맷된 변경사항 텍스트
 */
export function formatChanges(changes) {
  let text = '';

  if (changes.added.length > 0) {
    text += '## 새로운 휴가\n\n';
    changes.added.forEach(item => {
      text += `- **${item.employeeName}** (${item.department}): ${item.vacationType}, ${item.startDate} ~ ${item.endDate} (${item.days}일)\n`;
    });
    text += '\n';
  }

  if (changes.modified.length > 0) {
    text += '## 변경된 휴가\n\n';
    changes.modified.forEach(({ before, after }) => {
      text += `- **${after.employeeName}**\n`;
      text += `  - 변경 전: ${before.vacationType}, ${before.startDate} ~ ${before.endDate} (${before.days}일)\n`;
      text += `  - 변경 후: ${after.vacationType}, ${after.startDate} ~ ${after.endDate} (${after.days}일)\n`;
    });
    text += '\n';
  }

  if (changes.removed.length > 0) {
    text += '## 취소된 휴가\n\n';
    changes.removed.forEach(item => {
      text += `- **${item.employeeName}** (${item.department}): ${item.vacationType}, ${item.startDate} ~ ${item.endDate}\n`;
    });
    text += '\n';
  }

  return text || '변경사항 없음';
}

/**
 * 히스토리 파일 정리 (오래된 파일 삭제)
 *
 * @param {number} daysToKeep - 보관할 일수 (기본: 30일)
 */
export async function cleanupOldHistory(daysToKeep = 30) {
  try {
    const files = await fs.readdir(HISTORY_DIR);
    const now = Date.now();
    const maxAge = daysToKeep * 24 * 60 * 60 * 1000; // 밀리초로 변환

    for (const file of files) {
      if (file.startsWith('vacation-') && file.endsWith('.json')) {
        const filePath = path.join(HISTORY_DIR, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          console.log(`  - 오래된 히스토리 파일 삭제: ${file}`);
        }
      }
    }
  } catch (error) {
    console.error('히스토리 정리 실패:', error.message);
  }
}
