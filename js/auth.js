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
