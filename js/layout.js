/* =========================================================
   공통 사이드바 렌더링
   - 각 페이지 <body data-area="user|admin" data-active="키"> 로 지정
   - file:// 로 바로 열어도 동작 (fetch 미사용, DOM 생성 방식)
   - 학생 사이드바: 상단 링크(메인/내 스토어) + 접이식 그룹(챌린지 / 발주 & 광고)
     · 그룹명(좌측) 클릭 → 그 영역 메인으로 이동
     · 우측 화살표 클릭 → 세부 메뉴 펼치기/접기
   ========================================================= */
(function () {
  // ---------- 학생 메뉴 정의 ----------
  const STUDENT = {
    brand: { title: '스파미의<br>쇼피파이 챌린지', sub: '수강생' },
    top: [
      { key: 'home',   ico: '🏠', label: '메인',         href: 'index.html' },
      { key: 'myinfo', ico: '🧾', label: '내 스토어 정보', href: 'my-info.html' },
    ],
    groups: [
      {
        id: 'challenge', ico: '🐤', label: '챌린지',
        items: [
          { key: 'chome',    ico: '🏆', label: '챌린지 메인',    href: 'challenge.html' },
          { key: 'calendar', ico: '📅', label: '일정 보기',      href: 'challenge-calendar.html' },
          { key: 'all',      ico: '📋', label: '숙제 전체 보기',  href: 'challenge-all.html' },
          { key: 'mine',     ico: '🗂️', label: '내 숙제',        href: 'challenge-mine.html' },
          { key: 'manual',   ico: '📘', label: '챌린지 보기',     href: 'manual.html', target: '_blank' },
        ],
      },
      {
        id: 'order', ico: '👑', label: '챌린지 심화 과정',
        items: [
          { key: 'ohome',    ico: '🏠', label: '심화 과정 메인',   href: 'order-home.html',     lock: true },
          { key: 'basic',    ico: '⚙️', label: '기본 설정',      href: 'basic-settings.html', lock: true },
          { key: 'ad',       ico: '📢', label: '광고 설정',      href: 'ad-settings.html',    lock: true },
          { key: 'setup',    ico: '🧩', label: '발주 세팅',      href: 'order-setup.html',    lock: true },
          { key: 'practice', ico: '📦', label: '발주 연습',      href: 'order-practice.html', lock: true },
          { key: 'cbguide',  ico: '📕', label: '차지백 가이드',   href: 'chargeback-manual.html', target: '_blank', lock: true },
        ],
      },
    ],
    footer: '<div class="who"><span id="sbName">수강생</span> <span class="badge-admin">수강생</span></div><a href="#">로그아웃</a>',
  };

  // ---------- 어드민 메뉴 정의 ----------
  const ADMIN = {
    brand: { title: '스파미의<br>쇼피파이 챌린지', sub: '어드민 영역' },
    items: [
      { key: 'home',        section: '공통',              ico: '🏠', label: '메인',        href: 'index.html' },
      { key: 'users',       section: '공통',              ico: '👥', label: '사용자 관리',  href: 'users.html' },
      { key: 'cohorts',     section: '공통',              ico: '🎓', label: '기수 관리',    href: 'cohorts.html' },
      { key: 'events',      section: '공통',              ico: '📅', label: '일정 관리',    href: 'events.html' },

      { key: 'manualsched', section: '챌린지',            ico: '📘', label: '매뉴얼 공개',   href: 'manual-schedule.html' },
      { key: 'challenges',  section: '챌린지',            ico: '📋', label: '숙제 관리',    href: 'challenges.html' },
      { key: 'chreview',    section: '챌린지',            ico: '✅', label: '숙제 검수',    href: 'challenge-review.html' },

      { key: 'products',    section: '발주 &amp; 광고 관리', ico: '🛍️', label: '상품 관리',   href: 'products.html' },
      { key: 'review',      section: '발주 &amp; 광고 관리', ico: '📝', label: '자료 검수',   href: 'review.html' },
      { key: 'results',     section: '발주 &amp; 광고 관리', ico: '📊', label: '결과 관리',   href: 'results.html' },
    ],
    footer: '<div class="who">GSK Admin <span class="badge-admin">관리자</span></div><a href="../index.html">사용자 화면으로</a>',
  };

  const area = document.body.dataset.area || 'user';
  const active = document.body.dataset.active || 'home';

  function linkHtml(it, extraCls) {
    const cls = ((it.key === active ? 'is-active ' : '') + (it.lock ? 'is-lockable ' : '') + (extraCls || '')).trim();
    const tgt = it.target ? ' target="' + it.target + '" rel="noopener"' : '';
    const ext = it.target === '_blank' ? ' <span class="nav-ext">↗</span>' : '';
    return '<a class="' + cls + '" href="' + it.href + '"' + tgt + ' data-key="' + it.key + '">' +
           '<span class="ico">' + it.ico + '</span>' + it.label + ext + '</a>';
  }

  // ---------- 어드민 렌더 (섹션 라벨 방식) ----------
  function renderAdmin() {
    let curSection = null;
    const links = ADMIN.items.map(function (it) {
      let head = '';
      if (it.section && it.section !== curSection) {
        curSection = it.section;
        head = '<li class="nav-sec">' + it.section + '</li>';
      }
      return head + '<li>' + linkHtml(it) + '</li>';
    }).join('');
    return sidebarHtml(ADMIN, '<ul class="nav">' + links + '</ul>');
  }

  // ---------- 학생 렌더 (상단 링크 + 접이식 그룹) ----------
  function openState() {
    let stored = null;
    try { stored = JSON.parse(localStorage.getItem('nav.groups') || 'null'); } catch (e) {}
    return stored || {};
  }
  function groupIsOpen(g, stored) {
    // 현재 보고 있는 그룹은 항상 펼침. 그 외엔 저장값(기본 펼침).
    if (active === g.key || g.items.some(function (i) { return i.key === active; })) return true;
    if (g.id in stored) return !!stored[g.id];
    return true;
  }
  function renderStudent() {
    const stored = openState();
    const top = STUDENT.top.map(function (it) { return '<li>' + linkHtml(it) + '</li>'; }).join('');

    const groups = STUDENT.groups.map(function (g) {
      const isOpen = groupIsOpen(g, stored);
      const curCls = g.items.some(function (i) { return i.key === active; }) ? ' is-current' : '';
      const items = g.items.map(function (it) { return '<li>' + linkHtml(it) + '</li>'; }).join('');
      return '<li class="nav-group' + (isOpen ? ' is-open' : '') + '" data-group="' + g.id + '">' +
               '<button class="nav-group__head' + curCls + '" type="button" aria-expanded="' + isOpen + '">' +
                 '<span class="ico">' + g.ico + '</span>' +
                 '<span class="nav-group__label">' + g.label + '</span>' +
                 '<span class="nav-group__caret">▾</span>' +
               '</button>' +
               '<ul class="nav-group__items">' + items + '</ul>' +
             '</li>';
    }).join('');

    return sidebarHtml(STUDENT, '<ul class="nav">' + top + groups + '</ul>');
  }

  function sidebarHtml(menu, navHtml) {
    return '<aside class="sidebar">' +
             '<div class="sidebar__brand"><h1>' + menu.brand.title + '</h1>' +
               '<span>' + menu.brand.sub + '</span></div>' +
             navHtml +
             '<div class="sidebar__footer">' + menu.footer + '</div>' +
           '</aside>';
  }

  const html = (area === 'admin') ? renderAdmin() : renderStudent();
  const mount = document.getElementById('sidebar');
  if (mount) mount.outerHTML = html;

  // ---------- 그룹 펼치기/접기 (헤더 전체 클릭) ----------
  document.querySelectorAll('.nav-group__head').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const grp = btn.closest('.nav-group');
      if (!grp) return;
      const opened = grp.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', opened);
      const stored = openState();
      stored[grp.dataset.group] = opened;
      try { localStorage.setItem('nav.groups', JSON.stringify(stored)); } catch (e) {}
    });
  });

  // ---------- 학생 이름 + 발주&광고 잠금 표시 ----------
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
            alert('챌린지 심화 과정은 아직 열리지 않았습니다.\n챌린지를 모두 마치고 승인되면 열립니다.');
          });
        });
      } catch (e) {}
    })();
  }
})();
