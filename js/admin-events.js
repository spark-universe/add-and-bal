/* =========================================================
   어드민 · 일정 관리
   - 일정 배포: 전체 / 특정 기수 / 특정 인원(event_users)
   - 배포한 일정 목록 (삭제)
   - 캘린더 보기: 기수 선택 → 그 기수 숙제(숨김 포함)·매뉴얼 공개·배포 일정
                  학생 선택 → 그 학생에게 보이는 그대로(개인 일정 + 제출 여부 색)
     (달력 그리기는 공용 js/calendar.js — 숙제는 시작~마감 막대)
   ========================================================= */
(function () {
  var MON = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  var admin = null;
  var cohorts = [], students = [], events = [];
  var coLabel = {};

  // esc 는 js/util.js 의 공통 함수 사용
  function iso(y, m, d) { return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0'); }
  function fmtDT(isoStr) {
    var d = new Date(isoStr), h = d.getHours(), ap = h >= 12 ? '오후' : '오전', h12 = h % 12 || 12;
    return (d.getMonth() + 1) + '.' + d.getDate() + ' ' + ap + ' ' + h12 + (d.getMinutes() ? ':' + String(d.getMinutes()).padStart(2, '0') : '시');
  }
  function fmtTime(isoStr) {
    var d = new Date(isoStr), h = d.getHours(), ap = h >= 12 ? '오후' : '오전', h12 = h % 12 || 12;
    return ap + ' ' + h12 + (d.getMinutes() ? ':' + String(d.getMinutes()).padStart(2, '0') : '시');
  }

  var el = function (id) { return document.getElementById(id); };

  /* ---------- 일정 배포 폼 ---------- */
  el('fScope').addEventListener('change', function () {
    el('cohortWrap').hidden = this.value !== 'cohort';
    el('usersWrap').hidden = this.value !== 'users';
  });

  el('saveBtn').addEventListener('click', async function () {
    var title = el('fTitle').value.trim();
    var dateV = el('fDate').value, timeV = el('fTime').value || '09:00';
    if (!title) { alert('제목을 입력하세요.'); return; }
    if (!dateV) { alert('날짜를 선택하세요.'); return; }
    var scope = el('fScope').value;
    var row = {
      title: title, memo: el('fMemo').value.trim() || null,
      start_at: new Date(dateV + 'T' + timeV).toISOString(),
      scope: scope, created_by: admin.id,
    };
    if (scope === 'cohort') row.cohort = Number(el('fCohort').value);
    if (scope === 'users' && Object.keys(selectedUsers).length === 0) { alert('대상 인원을 선택하세요.'); return; }

    el('saveBtn').disabled = true;
    var res = await sb.from('events').insert(row).select();
    if (res.error || !res.data || !res.data.length) { el('saveBtn').disabled = false; alert('배포 실패: ' + (res.error ? res.error.message : '권한 확인')); return; }
    if (scope === 'users') {
      var eid = res.data[0].id;
      var links = Object.keys(selectedUsers).map(function (uid) { return { event_id: eid, user_id: uid }; });
      var r2 = await sb.from('event_users').insert(links);
      if (r2.error) { alert('대상 저장 실패: ' + r2.error.message); }
    }
    el('saveBtn').disabled = false;
    // 폼 초기화
    el('fTitle').value = ''; el('fMemo').value = ''; el('fDate').value = '';
    selectedUsers = {}; updateUsersSummary();
    el('saved').hidden = false; setTimeout(function () { el('saved').hidden = true; }, 2000);
    await loadEvents();
    loadVMonth();
  });

  /* ---------- 특정 인원 선택 모달 ---------- */
  var selectedUsers = {}, tmpUsers = {};
  function updateUsersSummary() {
    var ids = Object.keys(selectedUsers);
    el('usersSummary').textContent = ids.length ? (ids.length + '명 선택됨') : '선택된 인원 없음';
  }
  function renderUList() {
    var q = (el('uSearch').value || '').trim().toLowerCase();
    var list = students.filter(function (s) {
      if (!q) return true;
      return (s.name || '').toLowerCase().indexOf(q) !== -1 || (s.email || '').toLowerCase().indexOf(q) !== -1;
    });
    el('uList').innerHTML = list.length ? list.map(function (s) {
      return '<label style="display:flex;align-items:center;gap:9px;padding:9px 12px;border-bottom:1px solid #f0f2f6;cursor:pointer;font-size:0.88rem;">' +
        '<input type="checkbox" class="u-cb" value="' + s.id + '"' + (tmpUsers[s.id] ? ' checked' : '') + '>' +
        '<b>' + esc(s.name || '(이름없음)') + '</b><span style="color:var(--muted);">· ' + esc(s.email || '') + '</span>' +
        '<span style="margin-left:auto;color:var(--muted);font-size:0.78rem;">' + esc(coLabel[s.cohort] || '') + '</span></label>';
    }).join('') : '<div style="padding:24px;text-align:center;color:var(--muted);font-size:0.85rem;">검색 결과가 없습니다.</div>';
    el('uCount').textContent = '선택 ' + Object.keys(tmpUsers).length + '명';
  }
  el('pickUsers').addEventListener('click', function () {
    tmpUsers = {}; Object.keys(selectedUsers).forEach(function (k) { tmpUsers[k] = true; });
    el('uSearch').value = ''; renderUList(); el('uModal').classList.add('is-open'); el('uSearch').focus();
  });
  function closeU() { el('uModal').classList.remove('is-open'); }
  el('uClose').addEventListener('click', closeU);
  el('uModal').addEventListener('click', function (e) { if (e.target === this) closeU(); });
  el('uSearch').addEventListener('input', renderUList);
  el('uList').addEventListener('change', function (e) {
    var cb = e.target.closest('.u-cb'); if (!cb) return;
    if (cb.checked) tmpUsers[cb.value] = true; else delete tmpUsers[cb.value];
    el('uCount').textContent = '선택 ' + Object.keys(tmpUsers).length + '명';
  });
  el('uAll').addEventListener('click', function () { el('uList').querySelectorAll('.u-cb').forEach(function (cb) { tmpUsers[cb.value] = true; }); renderUList(); });
  el('uNone').addEventListener('click', function () { el('uList').querySelectorAll('.u-cb').forEach(function (cb) { delete tmpUsers[cb.value]; }); renderUList(); });
  el('uApply').addEventListener('click', function () {
    selectedUsers = {}; Object.keys(tmpUsers).forEach(function (k) { selectedUsers[k] = true; });
    updateUsersSummary(); closeU();
  });

  /* ---------- 배포한 일정 목록 ---------- */
  function targetLabel(e) {
    if (e.scope === 'all') return '전체';
    if (e.scope === 'cohort') return (coLabel[e.cohort] || (e.cohort + '기'));
    if (e.scope === 'users') return '특정 인원 ' + (e.event_users ? e.event_users.length : 0) + '명';
    return '개인';
  }
  async function loadEvents() {
    var res = await sb.from('events').select('*, event_users(user_id)')
      .neq('scope', 'personal').order('start_at', { ascending: false })
      .limit(300);   // 배포 목록이 무한히 자라지 않게 최근 300건까지 (달력은 월 단위로 따로 조회)
    events = res.data || [];
    el('evCount').textContent = events.length ? '(' + events.length + '개)' : '';
    el('evBody').innerHTML = events.length ? events.map(function (e) {
      return '<tr>' +
        '<td>' + fmtDT(e.start_at) + '</td>' +
        '<td style="text-align:left;font-weight:600;">' + esc(e.title) + '</td>' +
        '<td>' + esc(targetLabel(e)) + '</td>' +
        '<td><button class="btn-link danger" data-del="' + e.id + '">삭제</button></td>' +
      '</tr>';
    }).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:30px;">배포한 일정이 없습니다.</td></tr>';
  }
  el('evBody').addEventListener('click', async function (e) {
    var btn = e.target.closest('button[data-del]'); if (!btn) return;
    if (!confirm('이 일정을 삭제할까요? 학생 캘린더에서도 사라집니다.')) return;
    var res = await sb.from('events').delete().eq('id', Number(btn.dataset.del));
    if (res.error) { alert('삭제 실패: ' + res.error.message); return; }
    await loadEvents(); loadVMonth();
  });

  /* ---------- 캘린더 보기 (기수별 / 학생별) ---------- */
  var vYear, vMonth, vCohort = null, vStudent = null;
  var vEvents = [], vChallenges = [], vManual = [], vSubs = {}, manualTitles = {};
  // 기수와 학생은 둘 중 하나만 — 하나를 고르면 다른 쪽은 해제
  el('coSel').addEventListener('change', function () {
    vCohort = this.value === '' ? null : Number(this.value);
    vStudent = null; el('stuSel').value = '';
    loadVMonth();
  });
  el('stuSel').addEventListener('change', function () {
    vStudent = this.value || null;
    vCohort = null; el('coSel').value = '';
    loadVMonth();
  });
  el('vPrev').addEventListener('click', function () { vShift(-1); });
  el('vNext').addEventListener('click', function () { vShift(1); });
  function vShift(d) { vMonth += d; if (vMonth < 0){ vMonth=11; vYear--; } if (vMonth > 11){ vMonth=0; vYear++; } loadVMonth(); }

  async function loadVMonth() {
    vEvents = []; vChallenges = []; vManual = []; vSubs = {};
    var stu = vStudent ? students.find(function (s) { return s.id === vStudent; }) : null;
    var cohort = vCohort != null ? vCohort : (stu ? stu.cohort : null);
    if (cohort == null) { renderVCal(); return; }
    var start = new Date(vYear, vMonth, 1).toISOString();
    var end = new Date(vYear, vMonth + 1, 1).toISOString();

    // 일정: 기수 모드 = 전체 + 이 기수 대상 / 학생 모드 = 그 학생에게 보이는 것 전부
    var ev = await sb.from('events').select('*, event_users(user_id)').gte('start_at', start).lt('start_at', end);
    vEvents = (ev.data || []).filter(function (e) {
      if (e.scope === 'all') return true;
      if (e.scope === 'cohort') return e.cohort === cohort;
      if (!vStudent) return false;   // 기수 모드: 개인·특정 인원 일정은 제외
      if (e.scope === 'personal') return e.owner_id === vStudent;
      if (e.scope === 'users') return (e.event_users || []).some(function (u) { return u.user_id === vStudent; });
      return false;
    });
    // 숙제: 기수 모드 = 숨김 포함 전부 / 학생 모드 = 표시 중인 것만 (+ 그 학생 제출 여부로 색)
    //   막대가 달을 넘어 이어질 수 있어 달 필터는 렌더러에 맡긴다
    var chq = sb.from('challenges').select('id,title,open_at,due_at,active').eq('cohort', cohort);
    if (vStudent) chq = chq.eq('active', true);
    var ch = await chq;
    vChallenges = (ch.data || []).filter(function (c) { return c.due_at; });
    if (vStudent && vChallenges.length) {
      var su = await sb.from('challenge_submissions').select('challenge_id').eq('user_id', vStudent);
      (su.data || []).forEach(function (s) { vSubs[s.challenge_id] = true; });
    }
    // 매뉴얼 예약 공개 (이번 달)
    var mm = await sb.from('cohort_manual').select('slug, publish_at, status')
      .eq('cohort', cohort).eq('status', 'scheduled')
      .gte('publish_at', start).lt('publish_at', end);
    vManual = (mm.data || []).filter(function (r) { return r.publish_at; });
    if (!Object.keys(manualTitles).length) {
      var mt = await sb.from('manual_chapters').select('slug, title');
      (mt.data || []).forEach(function (r) { manualTitles[r.slug] = r.title; });
    }
    renderVCal();
  }

  // 숙제 막대 색: 숨김 / 제출함(학생별) / 공개 전 / 마감 지남 / 진행 중
  function hwCls(c) {
    if (!c.active) return 'hidden';
    if (vStudent && vSubs[c.id]) return 'done';
    var now = Date.now();
    if (c.open_at && new Date(c.open_at).getTime() > now) return 'soon';
    return new Date(c.due_at).getTime() < now ? 'over' : 'todo';
  }

  function renderVCal() {
    el('vLabel').textContent = vYear + '년 ' + MON[vMonth];
    var hint = el('vHint');
    if (hint) hint.hidden = vCohort != null || !!vStudent;

    var spans = vChallenges.map(function (c) {
      var due = new Date(c.due_at);
      if (isNaN(due.getTime())) return null;
      var op = c.open_at ? new Date(c.open_at) : due;
      if (isNaN(op.getTime()) || op > due) op = due;
      var tip = (c.open_at ? '공개 ' + fmtDT(c.open_at) + ' → ' : '') + '마감 ' + fmtDT(c.due_at) + (c.active ? '' : ' (숨김)');
      return { start: op, end: due, cls: hwCls(c),
        label: '🚩 ' + esc(c.title) + (c.active ? '' : ' (숨김)'), attrs: 'title="' + esc(tip) + '"' };
    }).filter(Boolean);

    var items = {};
    function add(day, html) { (items[day] = items[day] || []).push(html); }
    vManual.forEach(function (r) {
      var d = new Date(r.publish_at);
      if (d.getFullYear() === vYear && d.getMonth() === vMonth)
        add(d.getDate(), '<span class="cal__ev manual">📘 ' + esc(manualTitles[r.slug] || r.slug) + ' 공개</span>');
    });
    vEvents.forEach(function (e) {
      var d = new Date(e.start_at);
      add(d.getDate(), '<span class="cal__ev ' + (e.scope === 'personal' ? 'mine' : 'adm') + '">' + esc(fmtTime(e.start_at)) + ' ' + esc(e.title) + '</span>');
    });

    var t = new Date();
    Cal.render(el('vCal'), { year: vYear, month: vMonth, todayISO: iso(t.getFullYear(), t.getMonth(), t.getDate()), spans: spans, items: items });
  }

  /* ---------- 초기화 ---------- */
  (async function init() {
    admin = await Auth.requireAdmin();
    if (!admin) return;

    var co = await sb.from('cohorts').select('*').order('id');
    cohorts = co.data || [];
    cohorts.forEach(function (c) { coLabel[c.id] = c.label + (c.enroll_date ? ' (' + c.enroll_date + ')' : ''); });
    el('fCohort').innerHTML = cohorts.map(function (c) { return '<option value="' + c.id + '">' + esc(coLabel[c.id]) + '</option>'; }).join('');

    var pr = await sb.from('profiles').select('id,name,email,cohort').neq('role', 'admin').order('name');
    students = pr.data || [];
    el('coSel').innerHTML = '<option value="">기수 선택…</option>' + cohorts.map(function (c) {
      return '<option value="' + c.id + '">' + esc(coLabel[c.id]) + '</option>';
    }).join('');
    el('stuSel').innerHTML = '<option value="">학생 선택…</option>' + students.map(function (s) {
      return '<option value="' + s.id + '">' + esc(s.name || s.email) + ' · ' + esc(coLabel[s.cohort] || '') + '</option>';
    }).join('');

    var now = new Date(); vYear = now.getFullYear(); vMonth = now.getMonth();
    updateUsersSummary();
    await loadEvents();
    loadVMonth();
  })();
})();
