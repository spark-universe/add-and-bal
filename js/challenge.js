/* =========================================================
   챌린지 (수강생)
   - challenges: 어드민이 등록한 과제 / challenge_submissions: 내 제출
   - 5개 화면을 한 파일에서 구동:
     Challenge.home()     챌린지 메인 (요약 + 마감 임박)
     Challenge.all()      과제 전체 보기 (목록 + 필터 + 상세/제출 모달)
     Challenge.calendar() 일정 보기 (월 달력에 마감일 표시)
     Challenge.mine()     내 과제 관리 (제출 내역 + 검수 결과)
   - TODO: 파일 첨부 업로드(submissions 버킷) 연동은 다음 단계 (지금은 메모/링크 제출)
   ========================================================= */
(function () {
  var MON = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  var user = null;

  // esc 는 js/util.js 의 공통 함수 사용
  function fmtDate(iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    var h = d.getHours(), ampm = h >= 12 ? '오후' : '오전', h12 = h % 12 || 12;
    return (d.getMonth() + 1) + '.' + d.getDate() + ' ' + ampm + ' ' + h12 + '시' +
      (d.getMinutes() ? ' ' + d.getMinutes() + '분' : '');
  }
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  // 마감까지 남은 일수 (지났으면 음수). 시간까지 반영해 마감 순간 이후면 지난 것으로 본다
  function daysLeft(due) {
    if (!due) return null;
    var ms = new Date(due) - new Date();
    return Math.floor(ms / 86400000);
  }
  function isOver(due) { return due ? (new Date(due) - new Date() < 0) : false; }

  // 서버(한국) 시간 — 반려 후 재작업 기한 판단에 로컬 시계 대신 사용
  var serverNow = Date.now();
  async function loadServerNow() {
    try { var r = await sb.rpc('server_now'); if (r && r.data) { var t = Date.parse(r.data); if (!isNaN(t)) serverNow = t; } } catch (e) {}
  }
  var REWORK_MS = 3 * 86400000;   // 반려일로부터 3일
  function fmtDeadline(t) {
    try { return new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(t)); }
    catch (e) { return new Date(t).toLocaleString('ko-KR'); }
  }

  // 과제 + 내 제출을 합쳐서 가져온다 (내 기수 과제만)
  var myCohortLabel = '';
  var myCohort = 1;                 // 내 기수 (캘린더의 매뉴얼 예약 공개 조회에 사용)
  var manualTitles = {};            // slug → 매뉴얼 제목
  var monthManual = [];             // 이번 달 매뉴얼 예약 공개 (내 기수)
  async function fetchData() {
    await loadServerNow();
    var prof = await sb.from('profiles').select('cohort, enroll_date').eq('id', user.id).single();
    // 0 = 미분류(그대로 0으로 조회), null 이면 기본 1
    var cohort = (prof.data && prof.data.cohort != null) ? prof.data.cohort : 1;
    myCohort = cohort;

    // 내 수강일: 개인 수강일 우선, 없으면 기수 수강일 (수강생은 기수 대신 날짜만 봄)
    myCohortLabel = (prof.data && prof.data.enroll_date) || '';
    if (!myCohortLabel) {
      var co = await sb.from('cohorts').select('enroll_date').eq('id', cohort).maybeSingle();
      myCohortLabel = (co.data && co.data.enroll_date) || '';
    }

    var ch = await sb.from('challenges').select('*')
      .eq('active', true).eq('cohort', cohort)
      .order('due_at', { ascending: true });
    var su = await sb.from('challenge_submissions').select('*').eq('user_id', user.id);
    var subs = {};
    (su.data || []).forEach(function (s) { subs[s.challenge_id] = s; });

    // 예약 공개: open_at 이 미래인 과제는 아직 안 보이게 (그 시각 지나면 자동 노출)
    var now = Date.now();
    return (ch.data || [])
      .filter(function (c) { return !c.open_at || new Date(c.open_at).getTime() <= now; })
      .map(function (c) {
        c.sub = subs[c.id] || null;
        return c;
      });
  }

  // 제출 확정된 것만 '제출 인정' (초안 draft 는 미인정). 구버전 submitted 는 확정으로 간주.
  function confirmed(c) { return !!(c.sub && c.sub.status !== 'draft'); }

  // 검수 결과(통과/미통과) 알림 — 이미 본 결과는 localStorage 로 기억해 NEW 를 뗀다
  function reviewed(c) { return confirmed(c) && (c.sub.review_status === 'pass' || c.sub.review_status === 'fail'); }
  function revKey(s) { return 'chrev_' + s.id + '_' + (s.reviewed_at || ''); }
  function isSeen(s) { try { return !!localStorage.getItem(revKey(s)); } catch (e) { return true; } }
  function markSeen(s) { try { localStorage.setItem(revKey(s), '1'); } catch (e) {} }
  function isNew(c) { return reviewed(c) && !isSeen(c.sub); }

  function statusTag(c) {
    if (confirmed(c)) {
      if (c.sub.review_status === 'pass') return '<span class="tag tag--ok">통과</span>';
      if (c.sub.review_status === 'fail') return '<span class="tag tag--no">미통과</span>';
      return '<span class="tag tag--wait">검수 대기</span>';
    }
    if (c.sub) return '<span class="tag tag--wait">임시저장</span>';   // 초안(확정 전)
    if (isOver(c.due_at)) return '<span class="tag tag--no">기한 지남</span>';
    return '<span class="tag tag--wait">미제출</span>';
  }

  /* ================= 챌린지 메인 ================= */
  async function home() {
    user = await require();
    if (!user) return;
    setName('chName');

    var list = await fetchData();
    var badge = document.getElementById('chCohort');
    if (badge && myCohortLabel) { badge.textContent = myCohortLabel; badge.hidden = false; }
    var done = list.filter(function (c) { return confirmed(c); });
    var soon = list.filter(function (c) {
      var d = daysLeft(c.due_at);
      return !confirmed(c) && d != null && d >= 0 && d <= 3;
    });
    var score = done.reduce(function (a, c) { return a + (c.sub.score || 0); }, 0);

    setText('cTotal', list.length);
    setText('cDone', done.length);
    setText('cSoon', soon.length);
    setText('cScore', score);

    await renderPromo(list);
    renderReviewNoti(list);

    var upcoming = list.filter(function (c) { return !confirmed(c) && c.due_at; }).slice(0, 6);
    var body = document.getElementById('chBody');
    if (!upcoming.length) {
      body.innerHTML = row(3, list.length ? '마감이 임박한 미제출 숙제가 없습니다.' : '등록된 숙제가 없습니다.');
      return;
    }
    body.innerHTML = upcoming.map(function (c) {
      return '<tr class="ch-click" data-id="' + c.id + '">' +
        '<td style="text-align:left;font-weight:600;">' + esc(c.title) + '</td>' +
        '<td>' + fmtDate(c.due_at) + '</td>' +
        '<td>' + statusTag(c) + '</td>' +
      '</tr>';
    }).join('');
    // 메인의 과제 행을 클릭하면 '숙제 관리'로 이동해 해당 과제를 바로 연다
    body.querySelectorAll('[data-id]').forEach(function (el) {
      el.style.cursor = 'pointer';
      el.addEventListener('click', function () {
        location.href = 'challenge-mine.html?open=' + this.dataset.id;
      });
    });
  }

  // 새로 검수된(안 본) 결과 알림 배너
  function renderReviewNoti(list) {
    var box = document.getElementById('reviewNoti');
    if (!box) return;
    var news = list.filter(isNew);
    if (!news.length) { box.innerHTML = ''; return; }
    var pass = news.filter(function (c) { return c.sub.review_status === 'pass'; }).length;
    var fail = news.length - pass;
    var parts = [];
    if (pass) parts.push('통과 ' + pass + '건');
    if (fail) parts.push('미통과 ' + fail + '건');
    box.innerHTML =
      '<a class="rev-noti" href="challenge-mine.html">' +
        '<span class="rev-noti__ico">🔔</span>' +
        '<span class="rev-noti__txt"><b>새 검수 결과 ' + news.length + '건</b>이 있어요 — ' + parts.join(' · ') +
          '<span class="rev-noti__go">확인하기 →</span></span>' +
      '</a>';
  }

  /* ===== 등급업(발주&광고 넘어가기) 신청 배너 ===== */
  async function renderPromo(list) {
    var box = document.getElementById('promoBox');
    if (!box) return;

    var pr = await sb.from('profiles').select('level').eq('id', user.id).single();
    var level = (pr.data && pr.data.level) || 0;

    // 이미 열렸으면 안내만
    if (level >= 1) {
      box.innerHTML =
        '<div class="promo is-open">' +
          '<div class="promo__body">' +
            '<div class="promo__title">🎉 챌린지 심화 과정이 열렸습니다</div>' +
            '<div class="promo__desc">메인 화면에서 챌린지 심화 과정으로 이동할 수 있습니다.</div>' +
          '</div>' +
          '<a class="btn-primary promo__btn" href="order-home.html">심화 과정으로 이동</a>' +
        '</div>';
      return;
    }

    // 챌린지 진행 상황 (검수 통과 기준)
    var total = list.length;
    var passed = list.filter(function (c) { return c.sub && c.sub.review_status === 'pass'; }).length;
    var eligible = total > 0 && passed === total;

    // 최근 신청 상태
    var lr = await sb.from('level_requests').select('*')
      .eq('user_id', user.id).order('created_at', { ascending: false }).limit(1);
    var last = (lr.data && lr.data[0]) || null;

    if (last && last.status === 'pending') {
      box.innerHTML =
        '<div class="promo is-wait">' +
          '<div class="promo__body">' +
            '<div class="promo__title">⏳ 승인 대기 중</div>' +
            '<div class="promo__desc">챌린지 심화 과정 넘어가기를 신청했습니다. 어드민 승인을 기다려 주세요.</div>' +
          '</div>' +
        '</div>';
      return;
    }

    var rejectMsg = (last && last.status === 'rejected')
      ? '<div class="promo__desc" style="color:var(--danger);">반려됨' +
        (last.note ? ' · 사유: ' + esc(last.note) : '') + '</div>'
      : '';

    box.innerHTML =
      '<div class="promo ' + (last && last.status === 'rejected' ? 'is-reject' : '') + '">' +
        '<div class="promo__body">' +
          '<div class="promo__title">🚀 챌린지 심화 과정으로 넘어가기</div>' +
          '<div class="promo__desc">챌린지 과제를 <b>모두 검수 통과</b>하면 신청할 수 있습니다. ' +
            '(검수 통과 ' + passed + ' / ' + total + ')</div>' +
          rejectMsg +
        '</div>' +
        '<button class="btn-primary promo__btn" id="promoApply"' + (eligible ? '' : ' disabled') + '>' +
          '등급업 신청' + '</button>' +
      '</div>';

    var btn = document.getElementById('promoApply');
    if (btn && eligible) {
      btn.addEventListener('click', async function () {
        if (!confirm('챌린지 심화 과정으로 넘어가기를 신청할까요?\n어드민 승인 후 열립니다.')) return;
        btn.disabled = true;
        var res = await sb.from('level_requests').insert({
          user_id: user.id, from_level: 0, to_level: 1
        });
        if (res.error) { btn.disabled = false; alert('신청 실패: ' + res.error.message); return; }
        await renderPromo(list);
      });
    }
  }

  /* ================= 과제 전체 보기 ================= */
  var allList = [], filter = 'all';

  async function all() {
    user = await require();
    if (!user) return;
    allList = await fetchData();

    document.querySelectorAll('.adv-tab').forEach(function (t) {
      t.addEventListener('click', function () {
        document.querySelectorAll('.adv-tab').forEach(function (x) { x.classList.remove('is-on'); });
        this.classList.add('is-on');
        filter = this.dataset.filter;
        renderAll();
      });
    });
    renderAll();
  }

  function renderAll() {
    var list = allList.filter(function (c) {
      if (filter === 'todo') return !c.sub;
      if (filter === 'done') return !!c.sub;
      return true;
    });
    document.getElementById('allCount').textContent = allList.length + '개 과제';

    var body = document.getElementById('allBody');
    if (!list.length) {
      body.innerHTML = row(4, '해당하는 숙제가 없습니다.');
      return;
    }
    body.innerHTML = list.map(function (c) {
      return '<tr class="ch-click" data-id="' + c.id + '">' +
        '<td style="text-align:left;font-weight:600;">' + esc(c.title) + '</td>' +
        '<td>' + fmtDate(c.open_at) + '</td>' +
        '<td>' + fmtDate(c.due_at) + '</td>' +
        '<td>' + statusTag(c) + '</td>' +
      '</tr>';
    }).join('');
    bindRows(allList);
  }

  /* ================= 일정 보기 (달력) ================= */
  var calList = [], calYear, calMonth, monthEvents = [];

  async function calendar() {
    user = await require();
    if (!user) return;
    calList = await fetchData();
    // 매뉴얼 제목표 (slug → 제목) 한 번 로드
    var mt = await sb.from('manual_chapters').select('slug, title');
    (mt.data || []).forEach(function (r) { manualTitles[r.slug] = r.title; });

    var now = new Date();
    calYear = now.getFullYear();
    calMonth = now.getMonth();

    document.getElementById('calPrev').addEventListener('click', function () { shift(-1); });
    document.getElementById('calNext').addEventListener('click', function () { shift(1); });
    wireEventModal();

    // 달력 클릭: 일정 마커 → 수정, 빈 날짜 → 추가, 과제 마커 → 상세
    document.getElementById('cal').addEventListener('click', function (e) {
      if (e.target.closest('.cal__ev.manual')) return;   // 매뉴얼 예약 공개 마커는 클릭 무시
      var evEl = e.target.closest('[data-ev]');
      if (evEl) { var ev = monthEvents.find(function (x) { return String(x.id) === evEl.dataset.ev; }); if (ev) openEvent(ev); return; }
      var hwEl = e.target.closest('[data-id]');
      if (hwEl) { var c = calList.find(function (x) { return String(x.id) === hwEl.dataset.id; }); if (c) openDetail(c); return; }
      var cell = e.target.closest('.cal__cell[data-day]');
      if (cell) openEvent(null, Number(cell.dataset.day));
    });

    await loadMonthEvents();
    renderCal();
  }
  function shift(d) {
    calMonth += d;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    if (calMonth > 11) { calMonth = 0; calYear++; }
    loadMonthEvents().then(renderCal);
  }
  async function loadMonthEvents() {
    var start = new Date(calYear, calMonth, 1).toISOString();
    var end = new Date(calYear, calMonth + 1, 1).toISOString();   // 보이는 달만 (데이터 최소화)
    var res = await sb.from('events').select('*').gte('start_at', start).lt('start_at', end).order('start_at');
    monthEvents = res.data || [];
    // 내 기수의 매뉴얼 예약 공개일 (이번 달) — 예약 상태이고 공개일시가 이 달에 있는 것
    var mm = await sb.from('cohort_manual').select('slug, publish_at, status')
      .eq('cohort', myCohort).eq('status', 'scheduled')
      .gte('publish_at', start).lt('publish_at', end);
    monthManual = (mm.data || []).filter(function (r) { return r.publish_at; });
  }
  function fmtTime(iso) {
    var d = new Date(iso), h = d.getHours(), ap = h >= 12 ? '오후' : '오전', h12 = h % 12 || 12;
    return ap + ' ' + h12 + (d.getMinutes() ? ':' + String(d.getMinutes()).padStart(2, '0') : '시');
  }
  function renderCal() {
    document.getElementById('calLabel').textContent = calYear + '년 ' + MON[calMonth];

    var byDay = {};   // 과제 마감
    calList.forEach(function (c) {
      if (!c.due_at) return;
      var d = new Date(c.due_at + 'T00:00:00');
      if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
        (byDay[d.getDate()] = byDay[d.getDate()] || []).push(c);
      }
    });
    var evDay = {};   // 일정
    monthEvents.forEach(function (e) {
      var d = new Date(e.start_at);
      (evDay[d.getDate()] = evDay[d.getDate()] || []).push(e);
    });
    var mDay = {};    // 매뉴얼 예약 공개 (내 기수)
    monthManual.forEach(function (r) {
      var d = new Date(r.publish_at);
      if (d.getFullYear() === calYear && d.getMonth() === calMonth)
        (mDay[d.getDate()] = mDay[d.getDate()] || []).push(r);
    });

    var first = new Date(calYear, calMonth, 1).getDay();
    var days = new Date(calYear, calMonth + 1, 0).getDate();
    var cells = ['일','월','화','수','목','금','토']
      .map(function (w) { return '<div class="cal__wd">' + w + '</div>'; });

    for (var i = 0; i < first; i++) cells.push('<div class="cal__cell is-empty"></div>');
    for (var day = 1; day <= days; day++) {
      var isToday = (todayISO() === iso(calYear, calMonth, day));
      var hw = (byDay[day] || []).map(function (c) {
        var cls = c.sub ? 'done' : (isOver(c.due_at) ? 'over' : 'todo');
        return '<span class="cal__ev ' + cls + '" data-id="' + c.id + '">' + esc(c.title) + '</span>';
      }).join('');
      var evs = (evDay[day] || []).map(function (e) {
        var mine = e.scope === 'personal' && e.owner_id === user.id;
        return '<span class="cal__ev ' + (mine ? 'mine' : 'adm') + '" data-ev="' + e.id + '">' +
          esc(fmtTime(e.start_at)) + ' ' + esc(e.title) + '</span>';
      }).join('');
      var mans = (mDay[day] || []).map(function (r) {
        return '<span class="cal__ev manual" title="매뉴얼 예약 공개">📘 ' + esc(manualTitles[r.slug] || r.slug) + ' 공개</span>';
      }).join('');
      cells.push('<div class="cal__cell' + (isToday ? ' is-today' : '') + '" data-day="' + day + '">' +
        '<span class="cal__num">' + day + '</span>' + hw + mans + evs + '</div>');
    }
    document.getElementById('cal').innerHTML = cells.join('');
  }
  function iso(y, m, d) {
    return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  }

  /* ===== 일정 추가/수정 모달 ===== */
  var evEditing = null;   // 수정 중인 일정 (null = 신규)
  function wireEventModal() {
    document.getElementById('evClose').addEventListener('click', closeEvent);
    document.getElementById('evCancel').addEventListener('click', closeEvent);
    document.getElementById('evModal').addEventListener('click', function (e) {
      if (e.target === this) closeEvent();
    });
    document.getElementById('evSave').addEventListener('click', saveEvent);
    document.getElementById('evDelete').addEventListener('click', deleteEvent);
  }
  function closeEvent() { document.getElementById('evModal').classList.remove('is-open'); evEditing = null; }
  function openEvent(ev, day) {
    evEditing = ev || null;
    var editable = !ev || (ev.scope === 'personal' && ev.owner_id === user.id);
    document.getElementById('evTitle').textContent = ev ? (editable ? '일정 수정' : '일정') : '일정 추가';
    document.getElementById('evAdminNote').hidden = editable;

    var name = document.getElementById('evName'), date = document.getElementById('evDate'),
        time = document.getElementById('evTime'), memo = document.getElementById('evMemo');
    if (ev) {
      var d = new Date(ev.start_at);
      name.value = ev.title || '';
      date.value = iso(d.getFullYear(), d.getMonth(), d.getDate());
      time.value = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      memo.value = ev.memo || '';
    } else {
      name.value = ''; memo.value = '';
      date.value = iso(calYear, calMonth, day || 1);
      time.value = '09:00';
    }
    [name, date, time, memo].forEach(function (el) { el.disabled = !editable; });
    document.getElementById('evSave').hidden = !editable;
    document.getElementById('evDelete').hidden = !(ev && editable);
    document.getElementById('evModal').classList.add('is-open');
  }
  async function saveEvent() {
    var title = document.getElementById('evName').value.trim();
    var dateV = document.getElementById('evDate').value;
    var timeV = document.getElementById('evTime').value || '09:00';
    if (!title) { alert('제목을 입력하세요.'); return; }
    if (!dateV) { alert('날짜를 선택하세요.'); return; }
    var startAt = new Date(dateV + 'T' + timeV).toISOString();
    var memo = document.getElementById('evMemo').value.trim() || null;

    var res;
    if (evEditing) {
      res = await sb.from('events').update({ title: title, start_at: startAt, memo: memo }).eq('id', evEditing.id);
    } else {
      res = await sb.from('events').insert({
        title: title, start_at: startAt, memo: memo,
        scope: 'personal', owner_id: user.id, created_by: user.id
      });
    }
    if (res.error) { alert('저장 실패: ' + res.error.message); return; }
    closeEvent();
    await loadMonthEvents();
    renderCal();
  }
  async function deleteEvent() {
    if (!evEditing) return;
    if (!confirm('이 일정을 삭제할까요?')) return;
    var res = await sb.from('events').delete().eq('id', evEditing.id);
    if (res.error) { alert('삭제 실패: ' + res.error.message); return; }
    closeEvent();
    await loadMonthEvents();
    renderCal();
  }

  /* ================= 내 과제 관리 ================= */
  var mineList = [], mineFilter = 'all';

  async function mine() {
    user = await require();
    if (!user) return;
    mineList = await fetchData();   // 미제출 과제까지 전부

    var done = mineList.filter(function (c) { return confirmed(c); });
    var pass = done.filter(function (c) { return c.sub.review_status === 'pass'; }).length;
    var wait = done.filter(function (c) { return c.sub.review_status === 'pending'; }).length;
    var score = done.reduce(function (a, c) { return a + (c.sub.score || 0); }, 0);

    setText('mDone', done.length);
    setText('mPass', pass);
    setText('mWait', wait);
    setText('mScore', score);

    document.querySelectorAll('.adv-tab').forEach(function (t) {
      t.addEventListener('click', function () {
        document.querySelectorAll('.adv-tab').forEach(function (x) { x.classList.remove('is-on'); });
        this.classList.add('is-on');
        mineFilter = this.dataset.filter;
        renderMine();
      });
    });
    renderMine();

    // 메인에서 넘어온 경우: ?open=<id> 과제 상세를 바로 연다
    var openId = new URLSearchParams(location.search).get('open');
    if (openId) {
      var target = mineList.find(function (c) { return String(c.id) === String(openId); });
      if (target) openDetail(target);
    }
  }

  function renderMine() {
    var list = mineList.filter(function (c) {
      if (mineFilter === 'todo') return !confirmed(c);
      if (mineFilter === 'done') return confirmed(c);
      if (mineFilter === 'pass') return confirmed(c) && c.sub.review_status === 'pass';
      return true;
    });
    document.getElementById('mineCount').textContent =
      list.length + ' / ' + mineList.length + '개';

    var body = document.getElementById('mineBody');
    if (!list.length) {
      body.innerHTML = row(6, mineList.length ? '해당하는 숙제가 없습니다.' : '등록된 숙제가 없습니다.');
      return;
    }
    body.innerHTML = list.map(function (c) {
      var review, submitted, score;
      if (confirmed(c)) {
        review = c.sub.review_status === 'pass' ? '<span class="tag tag--ok">통과</span>'
          : c.sub.review_status === 'fail' ? '<span class="tag tag--no">미통과</span>'
          : '<span class="tag tag--wait">검수 대기</span>';
        if (isNew(c)) review += ' <span class="ch-new">NEW</span>';
        if (reviewed(c) && c.sub.reviewed_at) {
          review += '<div style="font-size:0.72rem;color:var(--muted);margin-top:3px;">' +
            fmtDeadline(c.sub.reviewed_at) + ' ' + (c.sub.review_status === 'pass' ? '통과' : '미통과') + '</div>';
        }
        if (c.sub.review_reason) {
          review += '<div style="font-size:0.72rem;color:var(--muted);margin-top:3px;">' +
            esc(c.sub.review_reason) + '</div>';
        }
        submitted = fmtDate(c.sub.created_at);
        score = c.sub.score != null ? c.sub.score + '점' : '-';
      } else if (c.sub) {          // 초안(확정 전)
        review = '<span class="tag tag--wait">임시저장</span>';
        submitted = '<span style="color:var(--muted);">미확정</span>';
        score = '-';
      } else {
        review = isOver(c.due_at)
          ? '<span class="tag tag--no">기한 지남</span>'
          : '<span class="tag tag--wait">미제출</span>';
        submitted = '-';
        score = '-';
      }
      return '<tr class="ch-click" data-id="' + c.id + '">' +
        '<td style="text-align:left;font-weight:600;">' + esc(c.title) + '</td>' +
        '<td>' + fmtDate(c.due_at) + '</td>' +
        '<td>' + submitted + '</td>' +
        '<td>' + review + '</td>' +
        '<td>' + score + '</td>' +
        '<td><button class="btn-link" data-open="' + c.id + '">' +
          (c.sub ? '보기' : '제출') + '</button></td>' +
      '</tr>';
    }).join('');
    bindRows(mineList);
  }

  /* ================= 과제 상세 / 제출 모달 ================= */
  function bindRows(list) {
    document.querySelectorAll('[data-id]').forEach(function (el) {
      if (el.dataset.bound) return;
      el.dataset.bound = '1';
      el.addEventListener('click', function (e) {
        var id = Number(this.dataset.id);
        var c = list.find(function (x) { return x.id === id; });
        if (c) openDetail(c);
      });
    });
  }

  function openDetail(c) {
    if (reviewed(c)) markSeen(c.sub);   // 검수 결과를 열어보면 알림(NEW) 읽음 처리
    var d = daysLeft(c.due_at);
    var overdue = isOver(c.due_at) && !c.sub;

    // 연결된 매뉴얼 챕터로 바로가기 (새 탭). 연결 안 됐으면 표시 안 함
    var manualHtml = c.manual_slug
      ? '<a class="ch-manual-link" href="manual.html#' + esc(c.manual_slug) + '" target="_blank" rel="noopener">' +
          '📘 관련 챌린지 보기 <span aria-hidden="true">↗</span></a>'
      : '';

    // 관련 자료: 업로드 파일 다운로드 + 외부 링크
    var matParts = [];
    if (c.material_path) {
      var pub = sb.storage.from('materials').getPublicUrl(c.material_path).data.publicUrl;
      matParts.push('<a class="ch-manual-link" href="' + esc(pub) + '" target="_blank" rel="noopener" download>' +
        '📎 관련 자료 다운로드' + (c.material_name ? ' (' + esc(c.material_name) + ')' : '') + ' <span aria-hidden="true">↓</span></a>');
    }
    if (c.material_url) {
      matParts.push('<a class="ch-manual-link" href="' + esc(c.material_url) + '" target="_blank" rel="noopener">' +
        '🔗 관련 링크 열기 <span aria-hidden="true">↗</span></a>');
    }
    var materialHtml = matParts.join('');

    var isConf = confirmed(c);                       // 제출 확정 여부
    var rejected = isConf && c.sub.review_status === 'fail';          // 반려(미통과)
    var reworkUntil = (rejected && c.sub.reviewed_at) ? Date.parse(c.sub.reviewed_at) + REWORK_MS : null;
    var canRework = !!reworkUntil && serverNow <= reworkUntil;        // 반려일로부터 3일 이내면 재작업 가능
    var locked = isConf && !canRework;               // 확정 & (통과/대기/반려3일경과) → 잠금
    var overdue = isOver(c.due_at) && !isConf;       // 신규/초안 + 마감 지남 → 제출 불가
    var already = c.sub && c.sub.file_name
      ? '<div class="ch-file">📎 첨부: ' + esc(c.sub.file_name) + '</div>' : '';

    var submitSection, footBtns;
    if (locked) {
      // ===== 잠금(읽기 전용) =====
      var lockMsg = rejected
        ? '❌ 미통과 · 재작업 기간(반려 후 3일)이 지나 다시 제출할 수 없습니다.'
        : '🔒 제출이 확정되어 더 이상 수정할 수 없습니다.';
      submitSection =
        '<div class="ch-submit">' +
          '<div class="ch-submit__title">📤 과제 제출 <span class="tag ' + (rejected ? 'tag--no">미통과' : 'tag--ok">제출 확정됨') + '</span></div>' +
          '<div class="ch-locked">' + lockMsg + '</div>' +
          (c.sub.content ? '<div class="ch-subview">' + esc(c.sub.content) + '</div>' : '') +
          already +
        '</div>';
      footBtns = '<button class="btn-sm" data-close>닫기</button>';
    } else {
      // ===== 미확정(초안) 또는 반려 후 재작업 =====
      var draftNote;
      if (canRework) {
        draftNote = '<div class="ch-rework-note">❌ 미통과되었습니다. <b>반려일로부터 3일 이내</b>(' +
          fmtDeadline(reworkUntil) + '까지) 수정 후 다시 <b>제출 확정</b>하면 재검수됩니다.</div>';
      } else {
        draftNote = c.sub
          ? '<div class="ch-draft-note">✎ 임시저장된 초안입니다. <b>제출 확정하기</b>를 눌러야 제출로 인정됩니다.</div>' : '';
      }
      submitSection =
        '<div class="ch-submit">' +
          '<div class="ch-submit__title">📤 과제 제출' +
            (canRework ? ' <span class="tag tag--no">재작업</span>' : (c.sub ? ' <span class="tag tag--wait">임시저장</span>' : '')) + '</div>' +
          draftNote +
          '<div class="field">' +
            '<label>제출 내용 (메모 · 링크)</label>' +
            '<textarea id="chContent" rows="3" placeholder="과제 결과 링크나 설명을 입력하세요."' +
              (overdue ? ' disabled' : '') + ' style="width:100%;padding:11px;border:1px solid var(--border);' +
              'border-radius:8px;font-family:inherit;font-size:0.88rem;resize:vertical;">' +
              esc(c.sub ? c.sub.content || '' : '') + '</textarea>' +
          '</div>' +
          '<div class="field">' +
            '<label>파일 첨부 (선택)</label>' +
            '<input type="file" id="chFile"' + (overdue ? ' disabled' : '') + '>' +
            already +
          '</div>' +
          (overdue ? '<div class="adv-warn danger">마감이 지나 제출할 수 없습니다.</div>' : '') +
          '<div id="chErr" style="color:var(--danger);font-size:0.82rem;"></div>' +
        '</div>';
      footBtns = '<button class="btn-sm" data-close>닫기</button>' +
        (overdue ? '' :
          '<button class="btn-sm" id="chSave">임시 저장</button>' +
          '<button class="btn-sm is-primary" id="chConfirm">제출 확정하기</button>');
    }

    var box = document.createElement('div');
    box.className = 'modal-overlay is-open';
    box.innerHTML =
      '<div class="modal-card" style="max-width:600px;">' +
        '<div class="modal-card__head">' +
          '<h3>' + esc(c.title) + '</h3>' +
          '<button class="modal-close" data-close>×</button>' +
        '</div>' +
        '<div class="modal-card__body">' +
          '<div class="ch-meta">' +
            (c.due_at ? '<span class="ord-chip">마감 ' + fmtDate(c.due_at) +
              (d != null && d >= 0 ? ' (D-' + d + ')' : '') + '</span>' : '') +
          '</div>' +
          (c.description
            ? '<p style="white-space:pre-wrap;line-height:1.7;font-size:0.9rem;margin:14px 0;">' +
              esc(c.description) + '</p>'
            : '') +

          manualHtml + materialHtml +

          (isConf && c.sub.review_status !== 'pending'
            ? '<div class="ch-review ' + (c.sub.review_status === 'pass' ? 'ok' : 'no') + '" style="margin-top:16px;">' +
                (c.sub.review_status === 'pass' ? '✅ 검수 통과' : '❌ 미통과') +
                (c.sub.score != null ? ' · ' + c.sub.score + '점' : '') +
                (c.sub.reviewed_at ? '<div style="margin-top:6px;font-weight:600;">' +
                  fmtDeadline(c.sub.reviewed_at) + '에 ' +
                  (c.sub.review_status === 'pass' ? '통과' : '미통과') + ' 처리되었습니다.</div>' : '') +
                (c.sub.review_reason ? '<div style="margin-top:6px;font-weight:400;">사유: ' +
                  esc(c.sub.review_reason) + '</div>' : '') +
              '</div>'
            : '') +

          submitSection +
        '</div>' +
        '<div class="modal-card__foot">' + footBtns + '</div>' +
      '</div>';
    document.body.appendChild(box);

    box.addEventListener('click', function (e) {
      if (e.target === box || e.target.closest('[data-close]')) box.remove();
    });

    async function save(finalize) {
      var content = box.querySelector('#chContent').value.trim();
      var file = box.querySelector('#chFile').files[0];
      var errEl = box.querySelector('#chErr');
      var hasExisting = !!(c.sub && c.sub.file_path);
      if (!content && !file && !hasExisting) { errEl.textContent = '제출 내용이나 파일 중 하나는 입력하세요.'; return; }
      if (finalize && !confirm('제출을 확정하면 더 이상 수정할 수 없습니다.\n확정하시겠습니까?')) return;

      var saveBtn = box.querySelector('#chSave'), confBtn = box.querySelector('#chConfirm');
      if (saveBtn) saveBtn.disabled = true;
      if (confBtn) confBtn.disabled = true;
      errEl.textContent = '';

      var row = {
        challenge_id: c.id,
        user_id: user.id,
        content: content || null,
        status: finalize ? 'confirmed' : 'draft',
        review_status: 'pending',
        updated_at: new Date().toISOString(),
      };
      // 새 파일 없으면 기존 첨부 유지
      if (hasExisting) { row.file_path = c.sub.file_path; row.file_name = c.sub.file_name; }

      // 파일 첨부: 경로 첫 폴더가 본인 uid 여야 스토리지 정책을 통과한다
      if (file) {
        var lbl = confBtn || saveBtn; if (lbl) lbl.textContent = '업로드 중...';
        var path = user.id + '/challenge/' + c.id + '/' + Date.now() + '_' + file.name;
        var up = await sb.storage.from('submissions').upload(path, file, { upsert: true });
        if (up.error) {
          if (saveBtn) saveBtn.disabled = false; if (confBtn) { confBtn.disabled = false; confBtn.textContent = '제출 확정하기'; }
          errEl.textContent = '파일 업로드 실패: ' + up.error.message;
          return;
        }
        row.file_path = path; row.file_name = file.name;
      }

      var res = await sb.from('challenge_submissions')
        .upsert(row, { onConflict: 'challenge_id,user_id' });
      if (res.error) {
        if (saveBtn) saveBtn.disabled = false; if (confBtn) { confBtn.disabled = false; confBtn.textContent = '제출 확정하기'; }
        errEl.textContent = '제출 실패: ' + res.error.message;
        return;
      }
      box.remove();
      location.reload();
    }

    var sb1 = box.querySelector('#chSave'); if (sb1) sb1.addEventListener('click', function () { save(false); });
    var cf1 = box.querySelector('#chConfirm'); if (cf1) cf1.addEventListener('click', function () { save(true); });
  }

  /* ---------- 공통 ---------- */
  async function require() {
    return await Auth.require();
  }
  async function setName(id) {
    var prof = await sb.from('profiles').select('name').eq('id', user.id).single();
    if (prof.data && prof.data.name) setText(id, prof.data.name);
  }
  function setText(id, v) { var el = document.getElementById(id); if (el) el.textContent = v; }
  function row(cols, msg) {
    return '<tr><td colspan="' + cols + '" style="text-align:center;color:var(--muted);padding:40px;">' +
      esc(msg) + '</td></tr>';
  }

  window.Challenge = { home: home, all: all, calendar: calendar, mine: mine };
})();
