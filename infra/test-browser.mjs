/* =====================================================================
   infra/test-browser.mjs — 진짜 브라우저로 로그인 플로우 검증

     # 먼저 정적 서버를 띄운다
     powershell -File serve.ps1
     node infra/test-browser.mjs

   test-e2e.ps1(curl) 과 test-client.mjs(node) 로는 절대 못 잡는 게 하나 있다:
   **브라우저만 CORS 를 강제한다.** 게이트웨이가 헤더를 아무리 잘 붙여도
   실제 렌더링 컨텍스트에서 막히면 앱은 죽는다. 그래서 헤드리스 Chrome 을
   직접 띄워 login.html 의 진짜 핸들러를 돌린다.

   의존성 0 — Node 24 내장 WebSocket 으로 CDP 를 직접 말한다.
   사용자가 쓰던 Chrome 은 건드리지 않는다 (전용 user-data-dir 로 새로 띄움).
   ===================================================================== */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// SITE 로 운영 도메인도 검증할 수 있다:
//   SITE=https://challenge.sparkuniverse.kr node infra/test-browser.mjs
// ISP 리졸버에 옛 NXDOMAIN 이 캐시돼 있으면 RESOLVE_TO 로 우회한다.
const SITE = process.env.SITE ?? 'http://localhost:8000';
const RESOLVE_TO = process.env.RESOLVE_TO ?? '';
const PORT = 9333;
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PW = 'addbal-test-1234';

let pass = 0, fail = 0;
const check = (n, ok, d = '') => {
  if (ok) { pass++; console.log('  PASS  ' + n); }
  else { fail++; console.log('  FAIL  ' + n + '  <- ' + d); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

const profile = mkdtempSync(join(tmpdir(), 'addbal-chrome-'));
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--disable-extensions', '--remote-debugging-port=' + PORT,
  ...(RESOLVE_TO ? ['--host-resolver-rules=MAP ' + new URL(SITE).hostname + ' ' + RESOLVE_TO, '--ignore-certificate-errors-spki-list'] : []),
  '--user-data-dir=' + profile, 'about:blank'
], { stdio: 'ignore' });

const cleanup = () => {
  try { chrome.kill(); } catch { }
  try { rmSync(profile, { recursive: true, force: true }); } catch { }
};
process.on('exit', cleanup);

// ── CDP 접속 ─────────────────────────────────────────────────────────
let version;
for (let i = 0; i < 40; i++) {
  try { version = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); break; }
  catch { await sleep(250); }
}
if (!version) { console.error('Chrome 기동 실패'); cleanup(); process.exit(1); }

const browserWs = new WebSocket(version.webSocketDebuggerUrl);
await new Promise(r => browserWs.addEventListener('open', r, { once: true }));

let msgId = 0;
function rpc(ws, method, params = {}, sessionId) {
  const id = ++msgId;
  return new Promise((resolve, reject) => {
    const onMsg = e => {
      const m = JSON.parse(e.data);
      if (m.id !== id) return;
      ws.removeEventListener('message', onMsg);
      m.error ? reject(new Error(method + ': ' + m.error.message)) : resolve(m.result);
    };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
}

const { targetId } = await rpc(browserWs, 'Target.createTarget', { url: 'about:blank' });
const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const page = targets.find(t => t.id === targetId);
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));

// 콘솔 에러 + 네트워크 실패 수집 (CORS 차단이 여기로 떨어진다)
const consoleErrors = [], failedRequests = [];
const reqUrl = new Map();          // requestId -> URL. 어떤 요청이 실패했는지 알아야 판정이 된다
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.method === 'Runtime.exceptionThrown') {
    consoleErrors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
  }
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') {
    consoleErrors.push(m.params.args.map(a => a.value ?? a.description).join(' '));
  }
  if (m.method === 'Network.requestWillBeSent') {
    reqUrl.set(m.params.requestId, m.params.request.url);
  }
  if (m.method === 'Network.loadingFailed') {
    const u = reqUrl.get(m.params.requestId) ?? '(unknown)';
    // favicon 은 서버에 파일이 없어서 취소된다 — 앱 동작과 무관
    if (/favicon\.ico$/i.test(u)) return;
    // signOut 의 /auth/v1/logout 은 ERR_ABORTED 로 잡힌다. 서버는 204 를
    // 정상 반환하고(GoTrue 감사 로그에 남는다) 세션도 실제로 폐기되는데,
    // supabase-js 가 응답을 받은 뒤 클라이언트 쪽에서 요청을 취소해서 그렇다.
    // blocked=none 이라 CORS 차단이 아니다. 세션 폐기 여부는 아래에서 따로 본다.
    if (m.params.errorText === 'net::ERR_ABORTED' && !m.params.blockedReason) return;
    failedRequests.push(`${m.params.errorText} blocked=${m.params.blockedReason ?? 'none'} ${u}`);
  }
});
await rpc(ws, 'Runtime.enable');
await rpc(ws, 'Page.enable');
await rpc(ws, 'Network.enable');

const evaluate = async (expr, awaitPromise = true) => {
  const r = await rpc(ws, 'Runtime.evaluate', { expression: expr, awaitPromise, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? 'eval 실패');
  return r.result.value;
};
const goto = async url => {
  await rpc(ws, 'Page.navigate', { url });
  for (let i = 0; i < 60; i++) {
    await sleep(200);
    try { if (await evaluate('document.readyState', false) === 'complete') return; } catch { }
  }
};
const waitForUrl = async (frag, ms = 15000) => {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    await sleep(250);
    try { if ((await evaluate('location.pathname', false)).includes(frag)) return true; } catch { }
  }
  return false;
};

console.log('\n===== 브라우저 검증 (헤드리스 Chrome + CDP) =====');
console.log('  Chrome ' + version.Browser);

// 시작 상태 고정. [4] 가 student1 을 승인 상태로 바꾸므로, 초기화하지 않으면
// 두 번째 실행부터 [2](승인 대기 안내)가 깨진다.
// protect_profile_fields 트리거가 status 를 되돌리므로 replica 모드가 필요하다.
// (FK 캐스케이드도 같이 꺼지지만 여기서는 DELETE 가 없어 무해하다)
const { execSync: exec0 } = await import('node:child_process');
exec0(`docker exec -u postgres spark-postgres psql -d addbal -q -c "begin; set local session_replication_role = replica; update public.profiles set status='pending', level=0 where email='student1@addbal.test'; update public.profiles set role='admin', status='approved' where email='admin@addbal.test'; commit;"`, { stdio: 'ignore' });

// ── 1. 페이지 로드 + 설정 ────────────────────────────────────────────
console.log('\n[1] login.html 로드');
await goto(SITE + '/login.html');
check('페이지 로드', (await evaluate('document.title', false)).length > 0);
check('supabase-js CDN 로드됨', await evaluate('typeof supabase === "object"', false));
check('window.sb 생성됨', await evaluate('typeof sb === "object" && sb !== null', false));
const url = await evaluate('window.SUPABASE_URL', false);
// js/supabase.js 의 분기 계약: localhost 면 로컬 게이트웨이, 아니면 운영 도메인
const expectBackend = new URL(SITE).hostname.match(/^(localhost|127.0.0.1)$/)
  ? 'http://127.0.0.1:8100' : 'https://challenge.sparkuniverse.kr';
check('도메인 분기 (' + new URL(SITE).hostname + ' → 백엔드)', url === expectBackend, 'URL=' + url);
check('로드 중 콘솔 에러 없음', consoleErrors.length === 0, consoleErrors.join(' | '));

// ── 2. 승인 대기 수강생 (status=pending) ─────────────────────────────
console.log('\n[2] 미승인 수강생 로그인 → 승인 대기 안내여야 함');
consoleErrors.length = 0; failedRequests.length = 0;
await evaluate(`(() => {
  document.getElementById('email').value = 'student1@addbal.test';
  document.getElementById('password').value = '${PW}';
  document.getElementById('loginForm').requestSubmit();
})()`, false);
await sleep(3500);
const pendingMsg = await evaluate('document.getElementById("msg").textContent', false);
check('승인 대기 안내 표시', pendingMsg.includes('승인'), '메시지=' + pendingMsg);
check('페이지 이동 없음 (login.html 유지)', (await evaluate('location.pathname', false)).includes('login.html'));
// 여기가 핵심 — 브라우저가 CORS 로 막았다면 요청이 실패했을 것이다
check('CORS 차단 없음 (네트워크 실패 0)', failedRequests.length === 0, failedRequests.join(' | '));
check('콘솔 에러 없음', consoleErrors.length === 0, consoleErrors.join(' | '));
// 미승인이면 앱이 signOut 을 부른다. 실제로 세션이 끊겼는지 확인한다
// (로그아웃 요청이 ERR_ABORTED 로 잡히는 게 무해하다는 근거이기도 하다)
const stillIn = await evaluate('sb.auth.getSession().then(r => !!r.data.session)');
check('미승인 로그인 후 세션이 남지 않음 (signOut 실제 동작)', stillIn === false);

// ── 3. 어드민 로그인 → 어드민 화면 ───────────────────────────────────
console.log('\n[3] 어드민 로그인 → admin/index.html 라우팅');
consoleErrors.length = 0; failedRequests.length = 0;
await goto(SITE + '/login.html');
await evaluate(`(() => {
  document.getElementById('email').value = 'admin@addbal.test';
  document.getElementById('password').value = '${PW}';
  document.getElementById('loginForm').requestSubmit();
})()`, false);
check('admin/index.html 로 이동', await waitForUrl('/admin/'), '현재=' + await evaluate('location.pathname', false));
await sleep(2500);
check('어드민 화면 콘솔 에러 없음', consoleErrors.length === 0, consoleErrors.join(' | '));
check('어드민 화면 네트워크 실패 없음', failedRequests.length === 0, failedRequests.join(' | '));

// 실제 DB 조회가 브라우저 컨텍스트에서 되는지 (RLS + CORS 동시 확인)
const adminRows = await evaluate('sb.from("profiles").select("id").then(r => r.data ? r.data.length : -1)');
check('어드민이 전체 프로필 조회 (브라우저 컨텍스트)', adminRows >= 3, 'count=' + adminRows);

// ── 4. 승인된 수강생 → 훈련 메인 ─────────────────────────────────────
console.log('\n[4] 승인된 수강생 로그인 → index.html');
const { execSync } = await import('node:child_process');
execSync(`docker exec -u postgres spark-postgres psql -d addbal -q -c "begin; set local session_replication_role = replica; update public.profiles set status='approved' where email='student1@addbal.test'; commit;"`, { stdio: 'ignore' });

consoleErrors.length = 0; failedRequests.length = 0;
await goto(SITE + '/login.html');
await evaluate('sb.auth.signOut()');
await goto(SITE + '/login.html');
await evaluate(`(() => {
  document.getElementById('email').value = 'student1@addbal.test';
  document.getElementById('password').value = '${PW}';
  document.getElementById('loginForm').requestSubmit();
})()`, false);
const landed = await waitForUrl('/index.html');
check('index.html 로 이동', landed, '현재=' + await evaluate('location.pathname', false));
await sleep(2500);
check('훈련 메인 콘솔 에러 없음', consoleErrors.length === 0, consoleErrors.join(' | '));
const ownRows = await evaluate('sb.from("profiles").select("id").then(r => r.data ? r.data.length : -1)');
check('RLS: 수강생은 본인 1건만 (브라우저 컨텍스트)', ownRows === 1, 'count=' + ownRows);

// ── 5. 로그인 없이 보호 페이지 접근 ──────────────────────────────────
console.log('\n[5] 로그아웃 상태에서 보호 페이지 접근 → login.html 로 튕겨야 함');
await evaluate('sb.auth.signOut()');
await evaluate('localStorage.clear()', false);
await goto(SITE + '/index.html');
check('비로그인 시 login.html 로 리다이렉트', await waitForUrl('login.html', 8000),
  '현재=' + await evaluate('location.pathname', false));

console.log('\n=====================================');
console.log(`통과 ${pass} / 실패 ${fail}`);
cleanup();
process.exit(fail);
