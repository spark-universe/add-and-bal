/* =========================================================
   공통 사이드바 렌더링
   - 각 페이지 <body data-area="user|admin" data-active="키"> 로 지정
   - file:// 로 바로 열어도 동작 (fetch 미사용, DOM 생성 방식)
   ========================================================= */
(function () {
  const MENUS = {
    user: {
      brand: { title: '발주 &amp; 광고<br>설정 훈련', sub: '사용자 영역' },
      base: '',            // 사용자 페이지는 루트 기준
      items: [
        { key: 'hub',      ico: '🧭', label: '메뉴 선택',        href: 'home.html' },
        { key: 'home',     ico: '🏠', label: '훈련 메인',        href: 'index.html' },
        { key: 'myinfo',   ico: '🧾', label: '내 스토어 정보',    href: 'my-info.html' },
        { key: 'basic',    ico: '⚙️', label: '기본 설정 연습하기', href: 'basic-settings.html' },
        { key: 'ad',       ico: '📢', label: '광고 설정하기',      href: 'ad-settings.html' },
        { key: 'setup',    ico: '🧩', label: '발주 연습 세팅',     href: 'order-setup.html' },
        { key: 'practice', ico: '📦', label: '발주 연습하기',      href: 'order-practice.html' },
      ],
      footer: '<div class="who">홍길동 <span class="badge-admin">수강생</span></div><a href="#">로그아웃</a>',
    },
    challenge: {
      brand: { title: '챌린지', sub: '수강생 영역' },
      base: '',
      items: [
        { key: 'hub',      ico: '🧭', label: '메뉴 선택',      href: 'home.html' },
        { key: 'home',     ico: '🏆', label: '챌린지 메인',     href: 'challenge.html' },
        { key: 'calendar', ico: '📅', label: '일정 보기',       href: 'challenge-calendar.html' },
        { key: 'all',      ico: '📋', label: '과제 전체 보기',   href: 'challenge-all.html' },
        { key: 'mine',     ico: '🗂️', label: '내 과제 관리',     href: 'challenge-mine.html' },
        { key: 'manual',   ico: '📘', label: '스토어 초기작업 매뉴얼', href: 'manual.html', target: '_blank' },
      ],
      footer: '<div class="who">홍길동 <span class="badge-admin">수강생</span></div><a href="#">로그아웃</a>',
    },
    admin: {
      brand: { title: '발주 &amp; 광고<br>설정 훈련', sub: '어드민 영역' },
      base: '',            // 어드민 페이지는 admin/ 폴더 내부이므로 상대경로 그대로
      items: [
        { key: 'home',        section: '공통',            ico: '🏠', label: '메인',        href: 'index.html' },
        { key: 'registrants', section: '공통',            ico: '🙋', label: '가입자 관리',  href: 'registrants.html' },
        { key: 'users',       section: '공통',            ico: '👥', label: '사용자 관리',  href: 'users.html' },
        { key: 'cohorts',     section: '공통',            ico: '🎓', label: '기수 관리',    href: 'cohorts.html' },

        { key: 'challenges',  section: '챌린지 관리',      ico: '🏆', label: '챌린지 관리',   href: 'challenges.html' },
        { key: 'chreview',    section: '챌린지 관리',      ico: '✅', label: '과제 검수',    href: 'challenge-review.html' },
        { key: 'manualsched', section: '챌린지 관리',      ico: '📘', label: '매뉴얼 공개',   href: 'manual-schedule.html' },

        { key: 'products',    section: '발주 &amp; 광고 관리', ico: '🛍️', label: '상품 관리',    href: 'products.html' },
        { key: 'review',      section: '발주 &amp; 광고 관리', ico: '📝', label: '자료 검수',    href: 'review.html' },
        { key: 'promotions',  section: '발주 &amp; 광고 관리', ico: '🚀', label: '등급 승인',    href: 'promotions.html' },
        { key: 'results',     section: '발주 &amp; 광고 관리', ico: '📊', label: '결과 관리',    href: 'results.html' },
      ],
      footer: '<div class="who">GSK Admin <span class="badge-admin">관리자</span></div><a href="../index.html">사용자 화면으로</a>',
    },
  };

  const area = document.body.dataset.area || 'user';
  const active = document.body.dataset.active || 'home';
  const menu = MENUS[area];

  let curSection = null;
  const links = menu.items.map(function (it) {
    // 섹션이 바뀌면 구분 라벨을 먼저 넣는다 (어드민 사이드바 그룹화)
    let head = '';
    if (it.section && it.section !== curSection) {
      curSection = it.section;
      head = '<li class="nav-sec">' + it.section + '</li>';
    }
    const cls = it.key === active ? 'is-active' : '';
    // target 지정 시 새 탭으로 (예: 매뉴얼)
    const tgt = it.target ? ' target="' + it.target + '" rel="noopener"' : '';
    const ext = it.target === '_blank' ? ' <span class="nav-ext">↗</span>' : '';
    return head + '<li><a class="' + cls + '" href="' + it.href + '"' + tgt + '>' +
           '<span class="ico">' + it.ico + '</span>' + it.label + ext + '</a></li>';
  }).join('');

  const html =
    '<aside class="sidebar">' +
      '<div class="sidebar__brand"><h1>' + menu.brand.title + '</h1>' +
        '<span>' + menu.brand.sub + '</span></div>' +
      '<ul class="nav">' + links + '</ul>' +
      '<div class="sidebar__footer">' + menu.footer + '</div>' +
    '</aside>';

  const mount = document.getElementById('sidebar');
  if (mount) mount.outerHTML = html;
})();
