/* =========================================================
   auth.js — 로그인 확인(가드) + 로그아웃
   - 반드시 supabase 라이브러리와 js/supabase.js 로드 후에 포함
   - 사용: const user = await Auth.require();  // 로그인 안됐으면 login 페이지로 이동
   ========================================================= */
window.Auth = {
  // admin/ 하위 페이지면 '../', 아니면 '' 접두사
  prefix: function () {
    return location.pathname.indexOf('/admin/') !== -1 ? '../' : '';
  },

  // 로그인 필수 페이지에서 호출. 로그인 안됐으면 login.html 로 보냄
  require: async function () {
    var res = await sb.auth.getSession();
    if (!res.data.session) {
      location.href = this.prefix() + 'login.html';
      return null;
    }
    return res.data.session.user;
  },

  // 어드민 전용 페이지 가드. 로그인 + role=admin 이어야 통과
  requireAdmin: async function () {
    var user = await this.require();
    if (!user) return null;
    var prof = await sb.from('profiles').select('role, name').eq('id', user.id).single();
    if (prof.error || !prof.data || prof.data.role !== 'admin') {
      alert('어드민 권한이 필요합니다.');
      location.href = this.prefix() + 'login.html';
      return null;
    }
    user.profile = prof.data;
    return user;
  },

  logout: async function () {
    await sb.auth.signOut();
    location.href = this.prefix() + 'login.html';
  }
};

// 사이드바의 '로그아웃' 링크 자동 연결
document.addEventListener('click', function (e) {
  var a = e.target.closest && e.target.closest('a');
  if (a && a.textContent.trim() === '로그아웃') {
    e.preventDefault();
    Auth.logout();
  }
});

// 발주 & 광고 훈련(user 영역) 자동 가드
//  - 등급(level)이 1 이상이어야 접근 가능. 어드민은 통과.
//  - 아직 안 열렸으면 허브(home.html)로 돌려보냄. (챌린지 영역은 가드 없음)
(async function () {
  if (!document.body || document.body.dataset.area !== 'user') return;
  var res = await sb.auth.getSession();
  if (!res.data.session) { location.href = Auth.prefix() + 'login.html'; return; }
  var prof = await sb.from('profiles').select('role, level').eq('id', res.data.session.user.id).single();
  var p = (prof && prof.data) || {};
  if (p.role === 'admin') return;
  if ((p.level || 0) >= 1) return;
  alert('발주 & 광고 훈련은 아직 열리지 않았습니다.\n챌린지를 모두 마치고 승인되면 열립니다.');
  location.href = Auth.prefix() + 'home.html';
})();
