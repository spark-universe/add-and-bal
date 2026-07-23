/* =========================================================
   어드민 · 일정 관리
   - 일정 배포: 전체 / 특정 기수 / 특정 인원(event_users)
   - 배포한 일정 목록 (삭제)
   - 학생 캘린더 보기: 학생 선택 → 그 학생의 개인+어드민 일정 + 과제 마감
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
    renderVCal();
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
      .neq('scope', 'personal').order('start_at', { ascending: false });
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
    await loadEvents(); renderVCal();
  });

  /* ---------- 학생 캘린더 보기 ---------- */
  var vYear, vMonth, vStudent = null, vEvents = [], vChallenges = [];
  el('stuSel').addEventListener('change', function () { vStudent = this.value; loadStudentMonth(); });
  el('vPrev').addEventListener('click', function () { vShift(-1); });
  el('vNext').addEventListener('click', function () { vShift(1); });
  function vShift(d) { vMonth += d; if (vMonth < 0){ vMonth=11; vYear--; } if (vMonth > 11){ vMonth=0; vYear++; } loadStudentMonth(); }

  async function loadStudentMonth() {
    if (!vStudent) { renderVCal(); return; }
    var stu = students.find(function (s) { return s.id === vStudent; });
    var start = new Date(vYear, vMonth, 1).toISOString();
    var end = new Date(vYear, vMonth + 1, 1).toISOString();
    // 어드민은 전체 이벤트 조회 → 이 학생 대상만 필터
    var ev = await sb.from('events').select('*, event_users(user_id)').gte('start_at', start).lt('start_at', end);
    var all = ev.data || [];
    vEvents = all.filter(function (e) {
      if (e.scope === 'personal') return e.owner_id === vStudent;
      if (e.scope === 'all') return true;
      if (e.scope === 'cohort') return e.cohort === (stu ? stu.cohort : -1);
      if (e.scope === 'users') return (e.event_users || []).some(function (u) { return u.user_id === vStudent; });
      return false;
    });
    // 그 학생 기수의 공개 과제 마감
    var ch = await sb.from('challenges').select('id,title,due_at,active')
      .eq('cohort', stu ? stu.cohort : -1).eq('active', true);
    vChallenges = (ch.data || []).filter(function (c) {
      if (!c.due_at) return false;
      var d = new Date(c.due_at);
      return d.getFullYear() === vYear && d.getMonth() === vMonth;
    });
    renderVCal();
  }

  function renderVCal() {
    el('vLabel').textContent = vYear + '년 ' + MON[vMonth];
    var evDay = {}, hwDay = {};
    vEvents.forEach(function (e) { var d = new Date(e.start_at); (evDay[d.getDate()] = evDay[d.getDate()] || []).push(e); });
    vChallenges.forEach(function (c) { var d = new Date(c.due_at); (hwDay[d.getDate()] = hwDay[d.getDate()] || []).push(c); });

    var first = new Date(vYear, vMonth, 1).getDay();
    var days = new Date(vYear, vMonth + 1, 0).getDate();
    var cells = ['일','월','화','수','목','금','토'].map(function (w) { return '<div class="cal__wd">' + w + '</div>'; });
    for (var i = 0; i < first; i++) cells.push('<div class="cal__cell is-empty"></div>');
    for (var day = 1; day <= days; day++) {
      var hw = (hwDay[day] || []).map(function (c) { return '<span class="cal__ev todo">' + esc(c.title) + '</span>'; }).join('');
      var evs = (evDay[day] || []).map(function (e) {
        var mine = e.scope === 'personal';
        return '<span class="cal__ev ' + (mine ? 'mine' : 'adm') + '">' + esc(fmtTime(e.start_at)) + ' ' + esc(e.title) + '</span>';
      }).join('');
      cells.push('<div class="cal__cell"><span class="cal__num">' + day + '</span>' + hw + evs + '</div>');
    }
    el('vCal').innerHTML = cells.join('');
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
    el('stuSel').innerHTML = '<option value="">학생 선택…</option>' + students.map(function (s) {
      return '<option value="' + s.id + '">' + esc(s.name || s.email) + ' · ' + esc(coLabel[s.cohort] || '') + '</option>';
    }).join('');

    var now = new Date(); vYear = now.getFullYear(); vMonth = now.getMonth();
    updateUsersSummary();
    await loadEvents();
    renderVCal();
  })();
})();
