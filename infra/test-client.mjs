/* =====================================================================
   infra/test-client.mjs — 프론트와 "같은 라이브러리"로 검증

     node infra/test-client.mjs

   test-e2e.ps1 은 curl 로 HTTP 를 직접 때린다. 이 파일은 브라우저가 실제로
   로드하는 supabase-js UMD 번들(js/supabase.js 가 쓰는 그 CDN 파일)을 그대로
   가져와서, 페이지 스크립트가 하는 호출을 그대로 재현한다.
   sb.auth.signInWithPassword / sb.from(...).select / sb.storage... 가
   우리 게이트웨이 뒤에서 실제로 동작하는지 확인하는 게 목적이다.

   CORS 는 브라우저에서만 강제되므로 여기서는 검증되지 않는다 — 그건
   test-e2e 의 OPTIONS 프리플라이트 검사가 담당한다.
   ===================================================================== */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  if (ok) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + '  <- ' + detail); }
};

// js/supabase.js 에서 URL·키를 그대로 읽어온다 (프론트와 같은 값인지까지 확인)
const front = readFileSync(join(here, '..', 'js', 'supabase.js'), 'utf8');
const URL_LOCAL = front.match(/'(http:\/\/127\.0\.0\.1:\d+)'/)?.[1];
const ANON = front.match(/'(eyJ[A-Za-z0-9_.-]+)'/)?.[1];
if (!URL_LOCAL || !ANON) { console.error('js/supabase.js 에서 URL/키를 못 읽었습니다'); process.exit(1); }

console.log('\n===== supabase-js 클라이언트 검증 =====');
console.log('  URL : ' + URL_LOCAL + '  (js/supabase.js 의 로컬 분기 값)');

// 브라우저와 동일하게 UMD 번들을 로드한다
const umd = await (await fetch(CDN)).text();
const g = { window: {}, self: {}, globalThis: {} };
new Function('window', 'self', 'globalThis', umd + '\n;window.__sb = supabase;').call(g, g.window, g.self, g.window);
const supabase = g.window.__sb;
check('CDN UMD 번들 로드 (' + (umd.length / 1024 | 0) + 'KB)', typeof supabase?.createClient === 'function');

const sb = supabase.createClient(URL_LOCAL, ANON, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// ── 1. 로그인 (login.html 과 동일 호출) ───────────────────────────────
const { data: signin, error: signinErr } =
  await sb.auth.signInWithPassword({ email: 'student1@addbal.test', password: 'addbal-test-1234' });
check('sb.auth.signInWithPassword', !signinErr && !!signin?.session, signinErr?.message);
if (!signin?.session) { console.log('로그인 실패로 중단'); process.exit(1); }
const uid = signin.user.id;

// ── 2. 세션 확인 (js/auth.js 의 Auth.require 와 동일) ─────────────────
const { data: ses } = await sb.auth.getSession();
check('sb.auth.getSession — 세션 유지', !!ses?.session?.user?.id);

// ── 3. 프로필 조회 (js/auth.js 의 가드가 하는 그 쿼리) ────────────────
const prof = await sb.from('profiles').select('role, level').eq('id', uid).single();
check('sb.from(profiles).select().eq().single()', !prof.error && !!prof.data, prof.error?.message);
check('  role/level 값이 정상', prof.data?.role === 'student' && typeof prof.data?.level === 'number',
  JSON.stringify(prof.data));

// ── 4. RLS — 남의 프로필은 안 보여야 한다 ─────────────────────────────
const all = await sb.from('profiles').select('id');
check('RLS: 본인 1건만 조회됨', all.data?.length === 1, 'count=' + all.data?.length);

// ── 5. 목록 조회 (challenge.js / order-setup.js 패턴) ─────────────────
const cohorts = await sb.from('cohorts').select('id, enroll_date');
check('sb.from(cohorts) — 자기 기수만', !cohorts.error && cohorts.data?.length === 1,
  cohorts.error?.message ?? ('count=' + cohorts.data?.length));

const topics = await sb.from('topics').select('name').eq('active', true);
check('sb.from(topics) — 로그인 사용자 조회 가능', !topics.error, topics.error?.message);

// ── 6. 스토리지 (challenge.js 의 업로드 → 서명 URL 흐름) ──────────────
// js/util.js 의 storageKey() 를 그대로 가져와 쓴다 (프론트와 동일 경로 생성)
const util = readFileSync(join(here, '..', 'js', 'util.js'), 'utf8');
const storageKey = new Function(util + '\n;return storageKey;')();

const fileName = '과제 제출(최종).png';                 // 수강생이 실제로 올릴 법한 이름
const path = uid + '/challenge/1/' + Date.now() + '_' + storageKey(fileName);
const blob = new Blob(['client-test'], { type: 'text/plain' });

const up = await sb.storage.from('submissions').upload(path, blob, { upsert: true });
check('sb.storage.upload — 한글 파일명(storageKey 경유)', !up.error, up.error?.message);

const signed = await sb.storage.from('submissions').createSignedUrl(path, 60);
check('sb.storage.createSignedUrl', !signed.error && !!signed.data?.signedUrl, signed.error?.message);
if (signed.data?.signedUrl) {
  const body = await (await fetch(signed.data.signedUrl)).text();
  check('  서명 URL 로 내용 일치 확인', body === 'client-test', JSON.stringify(body));
}

// ── 7. 로그아웃 ──────────────────────────────────────────────────────
const out = await sb.auth.signOut();
check('sb.auth.signOut', !out.error, out.error?.message);
const after = await sb.from('profiles').select('id');
check('로그아웃 후에는 0건 (anon 으로 강등)', after.data?.length === 0, 'count=' + after.data?.length);

console.log('\n=====================================');
console.log(`통과 ${pass} / 실패 ${fail}`);
process.exit(fail);
