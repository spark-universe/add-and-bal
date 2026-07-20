/* =========================================================
   공통 사이드바 렌더링
   - 각 페이지 <body data-area="user|admin" data-active="키"> 로 지정
   - file:// 로 바로 열어도 동작 (fetch 미사용, DOM 생성 방식)
   ========================================================= */
(function () {
  const MENUS = {
    // 수강생 통합 사이드바 (홈 / 챌린지 / 발주 & 광고). user·challenge 영역 공통.
    student: {
      brand: { title: '발주 &amp; 광고<br>설정 훈련', sub: '수강생' },
      base: '',
      items: [
        { key: 'home',     ico: '🏠', label: '메인',            href: 'index.html' },
        { key: 'myinfo',   ico: '🧾', label: '내 스토어 정보',    href: 'my-info.html' },

        { key: 'chome',    section: '챌린지',       ico: '🏆', label: '챌린지 메인',       href: 'challenge.html' },
        { key: 'calendar', section: '챌린지',       ico: '📅', label: '일정 보기',         href: 'challenge-calendar.html' },
        { key: 'all',      section: '챌린지',       ico: '📋', label: '숙제 전체 보기',     href: 'challenge-all.html' },
        { key: 'mine',     section: '챌린지',       ico: '🗂️', label: '내 숙제',           href: 'challenge-mine.html' },
        { key: 'manual',   section: '챌린지',       ico: '📘', label: '챌린지 보기',        href: 'manual.html', target: '_blank' },

        { key: 'basic',    section: '발주 &amp; 광고', ico: '⚙️', label: '기본 설정',        href: 'basic-settings.html', lock: true },
        { key: 'ad',       section: '발주 &amp; 광고', ico: '📢', label: '광고 설정',        href: 'ad-settings.html', lock: true },
        { key: 'setup',    section: '발주 &amp; 광고', ico: '🧩', label: '발주 세팅',        href: 'order-setup.html', lock: true },
        { key: 'practice', section: '발주 &amp; 광고', ico: '📦', label: '발주 연습',        href: 'order-practice.html', lock: true },
      ],
      footer: '<div class="who"><span id="sbName">수강생</span> <span class="badge-admin">수강생</span></div><a href="#">로그아웃</a>',
    },
    admin: {
      brand: { title: '발주 &amp; 광고<br>설정 훈련', sub: '어드민 영역' },
      base: '',            // 어드민 페이지는 admin/ 폴더 내부이므로 상대경로 그대로
      items: [
        { key: 'home',        section: '공통',            ico: '🏠', label: '메인',        href: 'index.html' },
        { key: 'users',       section: '공통',            ico: '👥', label: '사용자 관리',  href: 'users.html' },
        { key: 'cohorts',     section: '공통',            ico: '🎓', label: '기수 관리',    href: 'cohorts.html' },
        { key: 'events',      section: '공통',            ico: '📅', label: '일정 관리',    href: 'events.html' },

        { key: 'manualsched', section: '챌린지',          ico: '📘', label: '매뉴얼 공개',   href: 'manual-schedule.html' },
        { key: 'challenges',  section: '챌린지',          ico: '📋', label: '숙제 관리',    href: 'challenges.html' },
        { key: 'chreview',    section: '챌린지',          ico: '✅', label: '숙제 검수',    href: 'challenge-review.html' },

        { key: 'products',    section: '발주 &amp; 광고 관리', ico: '🛍️', label: '상품 관리',    href: 'products.html' },
        { key: 'review',      section: '발주 &amp; 광고 관리', ico: '📝', label: '자료 검수',    href: 'review.html' },
        { key: 'results',     section: '발주 &amp; 광고 관리', ico: '📊', label: '결과 관리',    href: 'results.html' },
      ],
      footer: '<div class="who">GSK Admin <span class="badge-admin">관리자</span></div><a href="../index.html">사용자 화면으로</a>',
    },
  };

  const area = document.body.dataset.area || 'user';
  const active = document.body.dataset.active || 'home';
  const menu = (area === 'admin') ? MENUS.admin : MENUS.student;   // user·challenge → 통합 학생 메뉴

  let curSection = null;
  const links = menu.items.map(function (it) {
    // 섹션이 바뀌면 구분 라벨을 먼저 넣는다 (사이드바 그룹화)
    let head = '';
    if (it.section && it.section !== curSection) {
      curSection = it.section;
      head = '<li class="nav-sec">' + it.section + '</li>';
    }
    const cls = (it.key === active ? 'is-active' : '') + (it.lock ? ' is-lockable' : '');
    const tgt = it.target ? ' target="' + it.target + '" rel="noopener"' : '';
    const ext = it.target === '_blank' ? ' <span class="nav-ext">↗</span>' : '';
    return head + '<li><a class="' + cls.trim() + '" href="' + it.href + '"' + tgt + ' data-key="' + it.key + '">' +
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

  // 학생 이름 + 발주&광고 잠금 표시 (등급 안 열린 학생은 🔒)
  if (area !== 'admin' && typeof sb !== 'undefined') {
    (async function () {
      try {
        var s = await sb.auth.getSession();
        if (!s.data.session) return;
        var prof = await sb.from('profiles').select('name, level, role').eq('id', s.data.session.user.id).single();
        var p = (prof && prof.data) || {};
        var nameEl = document.getElementById('sbName');
        if (nameEl && p.name) nameEl.textContent = p.name;
        if (p.role === 'admin' || (p.level || 0) >= 1) return;   // 열린 학생·어드민은 잠금 없음
        document.querySelectorAll('.nav a.is-lockable').forEach(function (a) {
          a.classList.add('is-locked');
          a.insertAdjacentHTML('beforeend', ' <span class="nav-lock">🔒</span>');
          a.addEventListener('click', function (e) {
            e.preventDefault();
            alert('발주 & 광고 훈련은 아직 열리지 않았습니다.\n챌린지를 모두 마치고 승인되면 열립니다.');
          });
        });
      } catch (e) {}
    })();
  }
})();
