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

  // 현재 로그인 사용자의 프로필(role/level/name/is_demo) — 페이지당 1회만 조회하고 캐시
  _me: undefined,
  me: async function () {
    if (this._me !== undefined) return this._me;
    var res = await sb.auth.getSession();
    if (!res.data.session) { this._me = null; return null; }
    var prof = await sb.from('profiles').select('*').eq('id', res.data.session.user.id).single();
    this._me = (prof && prof.data) || {};
    this._me.id = res.data.session.user.id;
    return this._me;
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

// 발주 & 광고 훈련 페이지 자동 가드 (body data-lock="1" 인 페이지만)
//  - 등급(level)이 1 이상이어야 접근 가능. 어드민은 통과.
//  - 공용 데모(is_demo) 계정은 '광고 설정' 영역만 허용, 나머지는 광고 설정으로 돌려보냄.
//  - 아직 안 열렸으면 훈련 메인(index.html)으로 돌려보냄.
(async function () {
  if (!document.body || document.body.dataset.lock !== '1') return;
  var me = await Auth.me();
  if (!me) { location.href = Auth.prefix() + 'login.html'; return; }
  if (me.role === 'admin') return;
  if (me.is_demo) {                       // 데모: 광고 설정/캠페인 만들기만 허용
    window.__demoSim = true;              // 이 계정은 sessionStorage 사용(격리·자동삭제)
    var dpage = location.pathname.split('/').pop();
    if (dpage !== 'ad-settings.html' && dpage !== 'ad-campaign.html') {
      location.href = Auth.prefix() + 'ad-settings.html';
    }
    return;
  }
  // 영역별 열람: 이 페이지가 속한 영역이 access 에 있으면 허용 (전체열람 level>=1 도 허용)
  var PAGE_AREA = {
    'order-home.html': 'ohome', 'basic-settings.html': 'basic',
    'ad-settings.html': 'ad', 'ad-campaign.html': 'ad',
    'order-practice.html': 'practice', 'chargeback-manual.html': 'cbguide'
  };
  var page = location.pathname.split('/').pop();
  var area = PAGE_AREA[page];
  var access = Array.isArray(me.access) ? me.access : [];
  if ((me.level || 0) >= 1 || (area && access.indexOf(area) !== -1)) return;
  alert('이 과정은 아직 열람 권한이 없습니다.\n챌린지를 마치고 승인되면 열립니다.');
  location.href = Auth.prefix() + 'index.html';
})();
