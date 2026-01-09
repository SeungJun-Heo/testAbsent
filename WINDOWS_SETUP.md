# Windows 환경 설정 가이드

이 프로젝트는 **Windows에서 실행**되도록 설계되었습니다.

## 왜 Windows에서만 실행되나요?

### WSL에서 실행이 어려운 이유
- ❌ 회사 보안 프로그램 문제
- ❌ 브라우저 로그인 제한
- ❌ SSO/인증 문제
- ❌ 세션 공유 불가

### Windows 네이티브 실행의 장점
- ✅ 보안 프로그램과 호환
- ✅ 브라우저 로그인 정상 작동
- ✅ 설정 간단
- ✅ 안정적인 동작

## 설치 방법

### 1. Node.js 설치

[Node.js 공식 웹사이트](https://nodejs.org)에서 다운로드:
- LTS 버전 권장 (18.x 이상)
- Windows Installer (.msi) 다운로드 및 설치

설치 확인:
```powershell
node --version
npm --version
```

### 2. 프로젝트 다운로드

```powershell
# Git으로 클론
git clone https://github.com/SeungJun-Heo/testAbsent.git
cd testAbsent

# 또는 ZIP 파일 다운로드 및 압축 해제
```

### 3. 의존성 설치

```powershell
# PowerShell 또는 CMD에서 실행
npm install
npm run install-browsers
```

### 4. 환경 변수 설정

```powershell
# .env.example을 .env로 복사
Copy-Item .env.example .env

# 메모장으로 편집
notepad .env
```

최소 필수 설정:
```env
# 회사 페이지 URL
COMPANY_LOGIN_URL=https://your-company.com
VACATION_PAGE_URL=https://your-company.com/vacation

# Confluence 페이지 URL
CONFLUENCE_PAGE_URL=https://your-confluence.atlassian.net/wiki/spaces/TEAM/pages/123/Team-Calendar

# 브라우저 설정 (개발/테스트 시 false, 프로덕션 시 true)
HEADLESS=false
```

## 사용 방법

### 개발/테스트 단계

```powershell
# 브라우저를 보면서 테스트 (Confluence 업데이트 안 함)
npm test

# 1회 실행 테스트
npm run start -- --once
```

브라우저가 열리면:
1. 회사 시스템에 로그인
2. 프로그램이 자동으로 확인하고 진행
3. Confluence에 로그인 (필요시)

### 프로덕션 (자동화)

```powershell
# 스케줄 모드로 실행
npm start
```

프로그램이 백그라운드에서 실행되며:
- 설정된 시간(CRON_SCHEDULE)에 자동 실행
- 로그인 안 되어 있으면 10분마다 재확인
- 최대 2시간 대기

## Windows 스케줄러 설정

Windows 작업 스케줄러로 자동 실행을 설정할 수 있습니다.

### 1. 작업 스케줄러 열기

```powershell
# Win + R을 누르고 입력
taskschd.msc
```

### 2. 새 작업 만들기

1. **일반 탭**
   - 이름: `팀원 휴가 현황 자동화`
   - 설명: `Playwright를 이용한 휴가 현황 수집`
   - 사용자가 로그온할 때만 실행: 체크 ✓
   - 가장 높은 수준의 권한으로 실행: 체크 ✓

2. **트리거 탭**
   - 새로 만들기 클릭
   - 작업 시작: `일정에 따라`
   - 설정: `매일` 또는 `매주`
   - 시작: 오전 9:00 (또는 원하는 시간)
   - 고급 설정:
     - 작업 반복 간격: 1시간 (선택사항)
     - 기간: 8시간 (근무 시간)
   - 사용: 체크 ✓

3. **동작 탭**
   - 새로 만들기 클릭
   - 동작: `프로그램 시작`
   - 프로그램/스크립트: `powershell.exe`
   - 인수 추가:
     ```
     -ExecutionPolicy Bypass -File "C:\path\to\testAbsent\run.ps1"
     ```
   - 시작 위치: `C:\path\to\testAbsent`

4. **조건 탭**
   - 컴퓨터의 전원이 AC 전원일 때만 작업 시작: 체크 해제
   - 작업을 실행하기 위해 컴퓨터를 절전 모드에서 해제: 체크 ✓

5. **설정 탭**
   - 작업을 요청할 때 실행: 체크 ✓
   - 작업이 실패하면 다시 시작 간격: 10분
   - 다시 시작 시도: 3회

### 3. PowerShell 스크립트 생성

프로젝트 폴더에 `run.ps1` 파일 생성:

```powershell
# run.ps1
Set-Location $PSScriptRoot

# 로그 파일 경로
$logFile = "automation.log"
$date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# 실행
Write-Output "[$date] 시작" | Out-File -Append $logFile

try {
    npm run start -- --once 2>&1 | Out-File -Append $logFile
    Write-Output "[$date] 성공" | Out-File -Append $logFile
}
catch {
    Write-Output "[$date] 오류: $_" | Out-File -Append $logFile
}
```

권한 설정:
```powershell
# PowerShell 실행 정책 설정 (관리자 권한 필요)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 백그라운드 실행

### 방법 1: PowerShell에서 백그라운드 실행

```powershell
# 백그라운드로 실행
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm start" -WindowStyle Hidden

# 실행 중인 프로세스 확인
Get-Process | Where-Object {$_.ProcessName -like "*node*"}

# 종료
Stop-Process -Name "node" -Force
```

### 방법 2: PM2 사용 (권장)

```powershell
# PM2 설치
npm install -g pm2
npm install -g pm2-windows-service

# PM2 서비스 설치
pm2-service-install

# 앱 시작
pm2 start src/index.js --name vacation-automation

# 상태 확인
pm2 status
pm2 logs vacation-automation

# 재시작
pm2 restart vacation-automation

# 중지
pm2 stop vacation-automation

# 부팅 시 자동 시작 설정
pm2 startup
pm2 save
```

## 브라우저 설정

### Headless 모드

프로덕션 환경에서는 headless 모드 권장:

```env
HEADLESS=true
```

**주의:** headless 모드에서는 수동 로그인이 불가능합니다.
- 로그인되어 있을 시간에만 실행되도록 스케줄 설정
- 또는 headless=false로 설정하고 작업 스케줄러 사용

### 개발 모드

테스트할 때는 브라우저를 보면서:

```env
HEADLESS=false
```

## 로그 관리

### 로그 파일 확인

```powershell
# 실시간 로그 확인 (PowerShell)
Get-Content automation.log -Wait

# 최근 로그 보기
Get-Content automation.log -Tail 50
```

### 로그 정리

```powershell
# 30일 이상 된 로그 삭제
$logPath = ".\data\history"
Get-ChildItem $logPath -Recurse | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-30)} | Remove-Item
```

## 문제 해결

### Node.js 설치 오류

**증상:** npm 명령어가 인식되지 않음

**해결:**
1. Node.js 재설치
2. 시스템 재시작
3. PATH 환경 변수 확인
   ```powershell
   $env:Path
   ```

### 브라우저 실행 오류

**증상:** `browserType.launch: Executable doesn't exist`

**해결:**
```powershell
npx playwright install chromium
```

### 권한 오류

**증상:** PowerShell 스크립트 실행 불가

**해결:**
```powershell
# 관리자 권한으로 PowerShell 실행 후
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 로그인이 안 됨

**증상:** "로그인되지 않았습니다" 계속 표시

**해결:**
1. HEADLESS=false로 설정
2. 브라우저에서 직접 로그인
3. [src/modules/auth.js](src/modules/auth.js:40)의 선택자 확인

### 작업 스케줄러 실행 안 됨

**해결:**
1. 로그 파일 확인
2. 경로가 올바른지 확인
3. 권한 설정 확인
4. "사용자가 로그온할 때만 실행" 체크

## 보안 고려사항

### .env 파일 보호

```powershell
# 파일 속성에서 "읽기 전용" 설정
# 또는 숨김 파일로 설정
attrib +h .env
```

### 자동 로그인 설정 (선택사항)

회사 정책이 허용하는 경우:

```powershell
# Windows 자동 로그인 설정 (신중히!)
# netplwiz 실행 후 "사용자 이름과 암호를 입력해야 합니다" 체크 해제
```

**주의:** 보안 위험이 있으므로 개인 PC에서만 사용

## 성능 최적화

### 리소스 사용 줄이기

```env
# 브라우저 타임아웃 조정
BROWSER_TIMEOUT=15000

# Headless 모드 사용
HEADLESS=true
```

### 메모리 관리

```powershell
# Node.js 메모리 제한 설정
$env:NODE_OPTIONS="--max-old-space-size=512"
npm start
```

## 추천 설정

### 개발 환경
```env
HEADLESS=false
LOGIN_CHECK_RETRY_INTERVAL=60000      # 1분
LOGIN_CHECK_MAX_DURATION=600000       # 10분
```

### 프로덕션 환경
```env
HEADLESS=true
LOGIN_CHECK_RETRY_INTERVAL=600000     # 10분
LOGIN_CHECK_MAX_DURATION=7200000      # 2시간
CRON_SCHEDULE=0 9 * * 1-5             # 평일 오전 9시
```

### 작업 스케줄러 설정
- 매일 오전 9시 실행
- 로그인되어 있을 시간에 실행
- 실패 시 10분 후 재시도 (3회)

## 참고 자료

- [Node.js 공식 문서](https://nodejs.org)
- [Playwright 공식 문서](https://playwright.dev)
- [Windows 작업 스케줄러 가이드](https://learn.microsoft.com/windows/win32/taskschd/task-scheduler-start-page)
- [PM2 문서](https://pm2.keymetrics.io/)
