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
  var vEvents = [], vChallenges = [], vManual = [], vHolidays = [], vSubs = {}, manualTitles = {};
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
    vEvents = []; vChallenges = []; vManual = []; vHolidays = []; vSubs = {};
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
    // 휴일(공지 kind=holiday): 전체 또는 이 기수 대상, 이 달에 걸치는 것
    var last = new Date(vYear, vMonth + 1, 0).getDate();
    var hd = await sb.from('notices').select('id,title,from_date,to_date,cohort').eq('kind', 'holiday')
      .lte('from_date', iso(vYear, vMonth, last)).gte('to_date', iso(vYear, vMonth, 1));
    vHolidays = hd.error ? [] : (hd.data || []).filter(function (h) { return h.cohort == null || h.cohort === cohort; });
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
    // 휴일: 칸 색칠(dayCls) + 맨 앞 칩
    var dayCls = {};
    vHolidays.forEach(function (h) {
      Cal.eachDay(h.from_date, h.to_date, vYear, vMonth, function (day) {
        dayCls[day] = 'is-holiday';
        add(day, '<span class="cal__ev holiday" title="챌린지 진행 없음">🏮 ' + esc(h.title) + '</span>');
      });
    });
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
    Cal.render(el('vCal'), { year: vYear, month: vMonth, todayISO: iso(t.getFullYear(), t.getMonth(), t.getDate()), spans: spans, items: items, dayCls: dayCls });
  }

  /* ---------- 휴일 · 공지 (notices 표, supabase/notices.sql) ----------
     - 수강생 화면 상단 배너 + 하루 1회 팝업(js/layout.js). 휴일(kind=holiday)은 캘린더에 색칠
     - 휴일 기준 '일정 밀기': 예약 공개 챕터(cohort_manual)와 숙제 시작·마감(challenges)을 휴일의 평일 수만큼 뒤로 */
  var notices = [];
  var WD_KO = ['일', '월', '화', '수', '목', '금', '토'];
  function dOf(isoDate) { return new Date(isoDate + 'T00:00:00'); }          // 'YYYY-MM-DD' → 그날 0시(로컬)
  function fmtMD(d) { if (typeof d === 'string') d = dOf(d); return (d.getMonth() + 1) + '/' + d.getDate() + '(' + WD_KO[d.getDay()] + ')'; }
  function localInput(d) { var off = d.getTimezoneOffset() * 60000; return new Date(d - off).toISOString().slice(0, 16); }
  function isWeekend(d) { return d.getDay() === 0 || d.getDay() === 6; }
  // 휴일 범위 안의 평일(월~금) 수 = 잃는 진행일 수 = 미는 날 수
  function weekdaysBetween(fromISO, toISO) {
    var n = 0, d = dOf(fromISO), end = dOf(toISO);
    for (; d <= end; d.setDate(d.getDate() + 1)) if (!isWeekend(d)) n++;
    return n;
  }
  // 평일만 세어 n일 뒤 (주말 건너뜀, 시각은 그대로)
  function addBizDays(date, n) {
    var d = new Date(date.getTime()), k = 0;
    while (k < n) { d.setDate(d.getDate() + 1); if (!isWeekend(d)) k++; }
    return d;
  }
  function nextWeekday(isoDate) { var d = dOf(isoDate); d.setDate(d.getDate() + 1); while (isWeekend(d)) d.setDate(d.getDate() + 1); return d; }

  // 휴일 문구 자동 채움 (제목·날짜로)
  function suggestText() {
    var from = el('nFrom').value, to = el('nTo').value, title = el('nTitle').value.trim() || '연휴';
    if (!from || !to) return '';
    return fmtMD(from) + (from !== to ? '~' + fmtMD(to) : '') + '은 ' + title + '로 챌린지 진행이 없습니다.\n' +
      fmtMD(nextWeekday(to)) + '부터 다시 진행합니다.\n챕터 공개·숙제 마감 일정은 그만큼 뒤로 조정됩니다.';
  }
  function syncKind() {
    var hol = el('nKind').value === 'holiday';
    document.querySelectorAll('.n-holiday').forEach(function (x) { x.hidden = !hol; });
  }
  el('nKind').addEventListener('change', syncKind);
  ['nFrom', 'nTo'].forEach(function (id) {
    el(id).addEventListener('change', function () {
      if (id === 'nFrom' && el('nFrom').value && (!el('nTo').value || el('nTo').value < el('nFrom').value)) el('nTo').value = el('nFrom').value;
      if (el('nTo').value && !el('nShowUntil').value) el('nShowUntil').value = el('nTo').value + 'T23:59';
      if (!el('nText').value.trim()) el('nText').value = suggestText();
    });
  });
  el('nTitle').addEventListener('change', function () { if (!el('nText').value.trim()) el('nText').value = suggestText(); });

  el('nSave').addEventListener('click', async function () {
    var kind = el('nKind').value, title = el('nTitle').value.trim();
    var from = el('nFrom').value, to = el('nTo').value;
    if (!title) { alert('제목을 입력하세요.'); return; }
    if (kind === 'holiday') {
      if (!from || !to) { alert('휴일 시작·끝 날짜를 선택하세요.'); return; }
      if (to < from) { alert('휴일 끝 날짜가 시작보다 빠릅니다.'); return; }
    }
    var row = {
      kind: kind, title: title, body: el('nText').value.trim() || null,
      from_date: kind === 'holiday' ? from : null, to_date: kind === 'holiday' ? to : null,
      show_from: el('nShowFrom').value ? new Date(el('nShowFrom').value).toISOString() : new Date().toISOString(),
      show_until: el('nShowUntil').value ? new Date(el('nShowUntil').value).toISOString() : null,
      cohort: el('nCohort').value ? Number(el('nCohort').value) : null,
      popup: el('nPopup').checked, created_by: admin.id,
    };
    el('nSave').disabled = true;
    var res = await sb.from('notices').insert(row).select();
    el('nSave').disabled = false;
    if (res.error || !res.data || !res.data.length) {
      alert('등록 실패: ' + (res.error ? res.error.message : '권한 확인') +
        (res.error && /notices/.test(res.error.message) ? '\n(supabase/notices.sql 을 실행했는지 확인하세요)' : ''));
      return;
    }
    el('nTitle').value = ''; el('nText').value = ''; el('nFrom').value = ''; el('nTo').value = ''; el('nShowUntil').value = '';
    el('nShowFrom').value = localInput(new Date());
    el('nSaved').hidden = false; setTimeout(function () { el('nSaved').hidden = true; }, 2000);
    await loadNotices(); loadVMonth();
    if (kind === 'holiday' && confirm('휴일을 등록했습니다. 이 휴일 기준으로 지금 일정 밀기를 열까요?')) openShift(res.data[0]);
  });

  function noticeState(n) {
    var now = Date.now();
    if (Date.parse(n.show_from) > now) return '<span class="tag tag--wait">예정</span>';
    if (n.show_until && Date.parse(n.show_until) < now) return '<span class="tag">종료</span>';
    return '<span class="tag tag--ok">노출중</span>';
  }
  async function loadNotices() {
    var res = await sb.from('notices').select('*').order('created_at', { ascending: false }).limit(100);
    if (res.error) {
      el('nList').innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--danger);padding:30px;">불러오기 실패: ' +
        esc(res.error.message) + '<br>supabase/notices.sql 을 실행했는지 확인하세요.</td></tr>';
      return;
    }
    notices = res.data || [];
    el('nList').innerHTML = notices.length ? notices.map(function (n) {
      var hol = n.kind === 'holiday';
      return '<tr>' +
        '<td>' + (hol ? '🏮 휴일' : '📢 공지') + '</td>' +
        '<td style="text-align:left;"><b>' + esc(n.title) + '</b>' +
          (n.body ? '<div style="color:var(--muted);font-size:0.78rem;white-space:pre-line;margin-top:3px;">' + esc(n.body) + '</div>' : '') + '</td>' +
        '<td>' + (hol ? esc(fmtMD(n.from_date)) + (n.to_date !== n.from_date ? ' ~ ' + esc(fmtMD(n.to_date)) : '') : '-') + '</td>' +
        '<td style="font-size:0.8rem;">' + esc(fmtDT(n.show_from)) + ' ~ ' + (n.show_until ? esc(fmtDT(n.show_until)) : '계속') +
          (n.popup ? '<br><span style="color:var(--muted);">팝업 O</span>' : '') + '</td>' +
        '<td>' + (n.cohort == null ? '전체' : esc(coLabel[n.cohort] || (n.cohort + '기'))) + '</td>' +
        '<td>' + noticeState(n) + '</td>' +
        '<td style="white-space:nowrap;">' +
          (hol ? '<button class="btn-sm" data-shift="' + n.id + '">📆 일정 밀기</button>' +
            (n.shift_applied_at ? '<div style="font-size:0.72rem;color:var(--ok);font-weight:700;margin-top:3px;">적용됨 ' + esc(fmtDT(n.shift_applied_at)) + '</div>' : '') : '') +
          ' <button class="btn-link danger" data-ndel="' + n.id + '">삭제</button></td>' +
      '</tr>';
    }).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:30px;">등록된 휴일·공지가 없습니다.</td></tr>';
  }
  el('nList').addEventListener('click', async function (e) {
    var del = e.target.closest('button[data-ndel]');
    if (del) {
      if (!confirm('이 공지를 삭제할까요? 수강생 화면의 배너·팝업·캘린더 표시가 사라집니다. (이미 민 일정은 그대로입니다)')) return;
      var res = await sb.from('notices').delete().eq('id', Number(del.dataset.ndel));
      if (res.error) { alert('삭제 실패: ' + res.error.message); return; }
      await loadNotices(); loadVMonth();
      return;
    }
    var sh = e.target.closest('button[data-shift]');
    if (sh) { var n = notices.find(function (x) { return String(x.id) === sh.dataset.shift; }); if (n) openShift(n); }
  });

  /* ---------- 일정 밀기 ----------
     · 휴일 시작일 이후에 잡힌 것만, 그리고 아직 안 지난 것만 (이미 공개된 챕터·지난 마감은 그대로)
     · 예약 공개 챕터: 평일 N일 뒤 (주말 건너뜀)
     · 아직 안 열린 숙제: 시작을 평일 N일 뒤로, 마감은 시작이 밀린 만큼 그대로 따라감 (제출 기간 유지)
     · 이미 열린 숙제: 마감만 평일 N일 뒤 */
  var sNotice = null, sItems = [], sSel = {}, sN = 0;
  async function openShift(n) {
    sN = weekdaysBetween(n.from_date, n.to_date);
    if (!sN) { alert('휴일 기간에 평일이 없어 밀 일정이 없습니다.'); return; }
    sNotice = n;
    var fromStart = dOf(n.from_date), now = Date.now();
    var cm = await sb.from('cohort_manual').select('cohort,slug,status,publish_at').eq('status', 'scheduled').gte('publish_at', fromStart.toISOString());
    var ch = await sb.from('challenges').select('id,title,cohort,open_at,due_at,active').not('due_at', 'is', null);
    if (cm.error || ch.error) { alert('불러오기 실패: ' + (cm.error || ch.error).message); return; }
    if (!Object.keys(manualTitles).length) {
      var mt = await sb.from('manual_chapters').select('slug, title');
      (mt.data || []).forEach(function (r) { manualTitles[r.slug] = r.title; });
    }
    sItems = [];
    (cm.data || []).forEach(function (r) {
      var t = r.publish_at ? new Date(r.publish_at) : null;
      if (!t || isNaN(t.getTime()) || t.getTime() <= now) return;   // 이미 공개된 챕터는 건드리지 않음
      sItems.push({ type: 'manual', cohort: r.cohort, slug: r.slug, label: '📘 ' + (manualTitles[r.slug] || r.slug) + ' 공개', old: t, nw: addBizDays(t, sN) });
    });
    (ch.data || []).forEach(function (c) {
      var op = c.open_at ? new Date(c.open_at) : null, due = c.due_at ? new Date(c.due_at) : null;
      if (op && isNaN(op.getTime())) op = null;
      if (due && isNaN(due.getTime())) due = null;
      var row = { type: 'hw', id: c.id, cohort: c.cohort, label: '🚩 ' + c.title + (c.active ? '' : ' (숨김)') };
      if (op && op.getTime() > now && op >= fromStart) {
        row.open_old = op; row.open_new = addBizDays(op, sN);
        if (due) { row.due_old = due; row.due_new = new Date(due.getTime() + (row.open_new.getTime() - op.getTime())); }
      } else if (due && due.getTime() > now && due >= fromStart) {
        row.due_old = due; row.due_new = addBizDays(due, sN);
      } else return;
      sItems.push(row);
    });
    sSel = {}; sItems.forEach(function (it) { sSel[it.cohort] = true; });
    el('sTitle').textContent = '일정 밀기 — ' + n.title;
    el('sInfo').innerHTML = '<b>' + esc(fmtMD(n.from_date)) + (n.to_date !== n.from_date ? ' ~ ' + esc(fmtMD(n.to_date)) : '') + '</b> (평일 ' + sN + '일) 이후에 잡힌 ' +
      '<b>예약 공개 챕터</b>와 <b>숙제 시작·마감</b>을 평일 기준 <b>' + sN + '일</b> 뒤로 옮깁니다. 주말은 건너뛰고, 이미 공개된 챕터·지난 마감은 건드리지 않습니다. ' +
      '아직 안 열린 숙제는 시작이 밀린 만큼 마감도 같이 밀려 제출 기간이 유지됩니다.' +
      (n.shift_applied_at ? '<div style="color:var(--danger);font-weight:700;margin-top:6px;">⚠ 이 휴일로 ' + esc(fmtDT(n.shift_applied_at)) + '에 이미 적용했습니다. 다시 적용하면 한 번 더 밀립니다.</div>' : '');
    renderShift();
    el('sModal').classList.add('is-open');
  }
  function shiftList() { return sItems.filter(function (it) { return sSel[it.cohort]; }); }
  function renderShift() {
    var counts = {};
    sItems.forEach(function (it) { counts[it.cohort] = (counts[it.cohort] || 0) + 1; });
    var ids = Object.keys(counts).map(Number).sort(function (a, b) { return a - b; });
    el('sCohorts').innerHTML = ids.length ? ids.map(function (id) {
      return '<label style="display:flex;align-items:center;gap:6px;font-size:0.86rem;cursor:pointer;">' +
        '<input type="checkbox" class="s-co" value="' + id + '"' + (sSel[id] ? ' checked' : '') + '><b>' + esc(coLabel[id] || (id + '기')) + '</b>' +
        '<span style="color:var(--muted);">' + counts[id] + '건</span></label>';
    }).join('') : '<span style="color:var(--muted);font-size:0.86rem;">밀 일정이 없습니다. (휴일 이후에 잡힌 예약 공개·숙제 마감이 없음)</span>';
    var list = shiftList();
    el('sList').innerHTML = list.length ? list.map(function (it) {
      var co = esc(coLabel[it.cohort] || (it.cohort + '기'));
      if (it.type === 'manual') {
        return '<tr><td>' + co + '</td><td style="text-align:left;">' + esc(it.label) + '</td><td>' + esc(fmtDT(it.old)) + '</td><td style="font-weight:700;">' + esc(fmtDT(it.nw)) + '</td></tr>';
      }
      var lines = [];
      if (it.open_new) lines.push(['시작', it.open_old, it.open_new]);
      if (it.due_new) lines.push(['마감', it.due_old, it.due_new]);
      return lines.map(function (l, i) {
        return '<tr>' + (i === 0 ? '<td rowspan="' + lines.length + '">' + co + '</td><td rowspan="' + lines.length + '" style="text-align:left;">' + esc(it.label) + '</td>' : '') +
          '<td>' + l[0] + ' ' + esc(fmtDT(l[1])) + '</td><td style="font-weight:700;">' + esc(fmtDT(l[2])) + '</td></tr>';
      }).join('');
    }).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:24px;">선택한 기수에 밀 일정이 없습니다.</td></tr>';
    var nM = list.filter(function (it) { return it.type === 'manual'; }).length, nH = list.length - nM;
    el('sCount').textContent = list.length ? ('챕터 공개 ' + nM + '건 · 숙제 ' + nH + '건') : '';
    el('sApply').disabled = !list.length;
    el('sApply').textContent = list.length ? '적용 (' + list.length + '건)' : '적용';
  }
  el('sCohorts').addEventListener('change', function (e) {
    var cb = e.target.closest('.s-co'); if (!cb) return;
    sSel[Number(cb.value)] = cb.checked; renderShift();
  });
  function closeShift() { el('sModal').classList.remove('is-open'); sNotice = null; }
  el('sClose').addEventListener('click', closeShift);
  el('sCancel').addEventListener('click', closeShift);
  el('sModal').addEventListener('click', function (e) { if (e.target === this) closeShift(); });
  el('sApply').addEventListener('click', async function () {
    if (!sNotice) return;
    var list = shiftList(); if (!list.length) return;
    var nM = list.filter(function (it) { return it.type === 'manual'; }).length, nH = list.length - nM;
    if (sNotice.shift_applied_at && !confirm('이 휴일로 이미 일정 밀기를 적용했습니다. 다시 적용하면 일정이 한 번 더 밀립니다.\n정말 계속할까요?')) return;
    var coNames = Object.keys(sSel).filter(function (k) { return sSel[k]; }).map(function (k) { return coLabel[k] || (k + '기'); }).join(', ');
    if (!confirm(coNames + '\n챕터 공개 ' + nM + '건, 숙제 ' + nH + '건을 평일 ' + sN + '일 뒤로 옮깁니다. 계속할까요?')) return;
    var btn = el('sApply'); btn.disabled = true; btn.textContent = '적용 중...';
    var stamp = new Date().toISOString(), failed = 0;
    var mrows = list.filter(function (it) { return it.type === 'manual'; }).map(function (it) {
      return { cohort: it.cohort, slug: it.slug, status: 'scheduled', publish_at: it.nw.toISOString(), updated_at: stamp };
    });
    if (mrows.length) {
      var r1 = await sb.from('cohort_manual').upsert(mrows, { onConflict: 'cohort,slug' }).select('slug');
      if (r1.error) { alert('챕터 공개일 변경 실패: ' + r1.error.message); btn.disabled = false; btn.textContent = '적용'; return; }
      if (!r1.data || r1.data.length < mrows.length) failed += mrows.length - (r1.data || []).length;
    }
    var hws = list.filter(function (it) { return it.type === 'hw'; });
    var results = await Promise.all(hws.map(function (it) {
      var patch = {};
      if (it.open_new) patch.open_at = it.open_new.toISOString();
      if (it.due_new) patch.due_at = it.due_new.toISOString();
      return sb.from('challenges').update(patch).eq('id', it.id).select('id');
    }));
    results.forEach(function (r) { if (r.error || !r.data || !r.data.length) failed++; });
    var r3 = await sb.from('notices').update({ shift_applied_at: stamp }).eq('id', sNotice.id);
    btn.disabled = false; btn.textContent = '적용';
    closeShift();
    alert('일정 밀기 완료 — 챕터 공개 ' + mrows.length + '건, 숙제 ' + hws.length + '건' +
      (failed ? '\n⚠ ' + failed + '건은 반영되지 않았습니다. 캘린더에서 확인하세요.' : '') +
      (r3.error ? '\n(적용 표시 저장 실패: ' + r3.error.message + ')' : ''));
    await loadNotices(); loadVMonth();
  });

  /* ---------- 초기화 ---------- */
  (async function init() {
    admin = await Auth.requireAdmin();
    if (!admin) return;

    var co = await sb.from('cohorts').select('*').order('id');
    cohorts = co.data || [];
    cohorts.forEach(function (c) { coLabel[c.id] = c.label + (c.enroll_date ? ' (' + c.enroll_date + ')' : ''); });
    el('fCohort').innerHTML = cohorts.map(function (c) { return '<option value="' + c.id + '">' + esc(coLabel[c.id]) + '</option>'; }).join('');
    el('nCohort').innerHTML = '<option value="">전체 수강생</option>' + cohorts.map(function (c) { return '<option value="' + c.id + '">' + esc(coLabel[c.id]) + '</option>'; }).join('');
    el('nShowFrom').value = localInput(new Date());
    syncKind();

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
    await loadNotices();
    loadVMonth();
  })();
})();
