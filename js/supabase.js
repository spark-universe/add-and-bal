/* =========================================================
   Supabase 공통 클라이언트
   - 이 파일보다 먼저 CDN 라이브러리를 로드해야 함:
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="js/supabase.js"></script>
   - anon(publishable) 키는 프론트 공개용 (RLS로 보호). service_role 키는 넣지 말 것.
   ========================================================= */
window.SUPABASE_URL = 'https://unffhiygqmqxmnfaluep.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_MPMmFK4yKoVXrXl5UMJJcQ_2aZUTV8_';

window.sb = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);

// 내 프로필(profiles 한 행) — 페이지당 한 번만 조회하고, 그 '프로미스'를 공유한다.
// 사이드바(layout.js)·접근 가드(auth.js의 Auth.me)·페이지 스크립트가 각자 조회하던 것을 한 요청으로 합침.
// 결과를 캐시하는 대신 프로미스를 캐시해야 동시에 부른 쪽도 같은 요청을 타고, 세션이 없으면 null.
(function () {
  var profileP = null;
  window.myProfile = function () {
    if (!profileP) profileP = (async function () {
      var s = await sb.auth.getSession();
      if (!s.data.session) return null;
      var r = await sb.from('profiles').select('*').eq('id', s.data.session.user.id).single();
      var p = (r && r.data) || {};
      p.id = s.data.session.user.id;
      return p;
    })();
    return profileP;
  };
})();
