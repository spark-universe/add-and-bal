/* =========================================================
   어드민 → 수강생 비밀번호 직접 설정 (Vercel 서버리스 함수)
   - 다른 사람의 비밀번호는 Supabase Admin API(service_role 키)로만 바꿀 수 있고, 그 키는 브라우저에 두면 안 되므로
     이 함수가 서버에서만 사용한다. 의존성 없음(Node 내장 fetch) → package.json 불필요.
   - 호출: POST /api/admin-set-password
           헤더 Authorization: Bearer <어드민의 Supabase access_token>
           본문 { "userId": "<수강생 uuid>", "password": "<새 비밀번호>" }
   - 검증 순서
       (1) 토큰을 Supabase(/auth/v1/user)에 물어 호출자 확인            — 위조 토큰 불가
       (2) 호출자 프로필 role = 'admin' (본인 행은 RLS 로 읽힘)          — 수강생은 role 을 스스로 못 바꿈(protect 트리거)
       (3) 대상이 존재하고 role != 'admin'                              — 관리자 계정은 이 경로로 못 바꿈(피해 범위 축소)
       (4) PUT /auth/v1/admin/users/{id} { password }  (service_role)
   - 환경변수 (Vercel → Project → Settings → Environment Variables)
       SUPABASE_SERVICE_ROLE_KEY  필수. Supabase → Project Settings → API → service_role (secret)
       SUPABASE_URL, SUPABASE_ANON_KEY  선택. 없으면 아래 기본값(공개 정보) 사용
   ========================================================= */
const URL_DEFAULT  = 'https://unffhiygqmqxmnfaluep.supabase.co';
const ANON_DEFAULT = 'sb_publishable_MPMmFK4yKoVXrXl5UMJJcQ_2aZUTV8_';

module.exports = async function (req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const base    = (process.env.SUPABASE_URL || URL_DEFAULT).replace(/\/$/, '');
  const anon    = process.env.SUPABASE_ANON_KEY || ANON_DEFAULT;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!service) return res.status(500).json({ error: 'SERVICE_ROLE_KEY_MISSING' });

  // 호출자 토큰
  const authHdr = req.headers['authorization'] || '';
  const token = authHdr.startsWith('Bearer ') ? authHdr.slice(7).trim() : '';
  if (!token) return res.status(401).json({ error: '로그인이 필요합니다.' });

  // 입력
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }
  const userId   = body && typeof body.userId === 'string' ? body.userId.trim() : '';
  const password = body && typeof body.password === 'string' ? body.password : '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) return res.status(400).json({ error: '대상 사용자 id 형식이 올바르지 않습니다.' });
  if (password.length < 8 || password.length > 72) return res.status(400).json({ error: '비밀번호는 8자 이상 72자 이하여야 합니다.' });

  const asCaller = { apikey: anon, Authorization: 'Bearer ' + token };
  const asAdmin  = { apikey: service, Authorization: 'Bearer ' + service };

  try {
    // (1) 호출자 확인
    const me = await fetch(base + '/auth/v1/user', { headers: asCaller });
    if (!me.ok) return res.status(401).json({ error: '세션이 유효하지 않습니다. 다시 로그인하세요.' });
    const meJson = await me.json();
    const callerId = meJson && meJson.id;
    if (!callerId) return res.status(401).json({ error: '세션을 확인할 수 없습니다.' });

    // (2) 호출자 = 어드민?
    const pr = await fetch(base + '/rest/v1/profiles?id=eq.' + encodeURIComponent(callerId) + '&select=role', { headers: asCaller });
    const prJson = pr.ok ? await pr.json() : [];
    if (!Array.isArray(prJson) || !prJson[0] || prJson[0].role !== 'admin') return res.status(403).json({ error: '어드민만 사용할 수 있습니다.' });

    // (3) 대상 확인 (service 키로 RLS 우회 조회)
    const tg = await fetch(base + '/rest/v1/profiles?id=eq.' + encodeURIComponent(userId) + '&select=role,email', { headers: asAdmin });
    const tgJson = tg.ok ? await tg.json() : [];
    if (!Array.isArray(tgJson) || !tgJson[0]) return res.status(404).json({ error: '대상 수강생을 찾을 수 없습니다.' });
    if (tgJson[0].role === 'admin') return res.status(403).json({ error: '관리자 계정의 비밀번호는 여기서 바꿀 수 없습니다. (Supabase 대시보드에서 진행)' });

    // (4) 비밀번호 설정
    const up = await fetch(base + '/auth/v1/admin/users/' + encodeURIComponent(userId), {
      method: 'PUT', headers: Object.assign({ 'Content-Type': 'application/json' }, asAdmin),
      body: JSON.stringify({ password }),
    });
    if (!up.ok) {
      let msg = '';
      try { const j = await up.json(); msg = j.msg || j.message || j.error_description || j.error || ''; } catch (e) {}
      return res.status(502).json({ error: '비밀번호 설정에 실패했습니다.' + (msg ? ' (' + msg + ')' : '') });
    }
    return res.status(200).json({ ok: true, email: tgJson[0].email || null });
  } catch (e) {
    return res.status(502).json({ error: 'Supabase 에 연결하지 못했습니다.' });
  }
};
