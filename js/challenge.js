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

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
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

  // 과제 + 내 제출을 합쳐서 가져온다 (내 기수 과제만)
  async function fetchData() {
    var prof = await sb.from('profiles').select('cohort').eq('id', user.id).single();
    var cohort = (prof.data && prof.data.cohort) || 1;

    var ch = await sb.from('challenges').select('*')
      .eq('active', true).eq('cohort', cohort)
      .order('due_at', { ascending: true });
    var su = await sb.from('challenge_submissions').select('*').eq('user_id', user.id);
    var subs = {};
    (su.data || []).forEach(function (s) { subs[s.challenge_id] = s; });
    return (ch.data || []).map(function (c) {
      c.sub = subs[c.id] || null;
      return c;
    });
  }

  function statusTag(c) {
    if (!c.sub) {
      if (isOver(c.due_at)) return '<span class="tag tag--no">기한 지남</span>';
      return '<span class="tag tag--wait">미제출</span>';
    }
    if (c.sub.review_status === 'pass') return '<span class="tag tag--ok">통과</span>';
    if (c.sub.review_status === 'fail') return '<span class="tag tag--no">미통과</span>';
    return '<span class="tag tag--wait">검수 대기</span>';
  }

  /* ================= 챌린지 메인 ================= */
  async function home() {
    user = await require();
    if (!user) return;
    setName('chName');

    var list = await fetchData();
    var done = list.filter(function (c) { return c.sub; });
    var soon = list.filter(function (c) {
      var d = daysLeft(c.due_at);
      return !c.sub && d != null && d >= 0 && d <= 3;
    });
    var score = done.reduce(function (a, c) { return a + (c.sub.score || 0); }, 0);

    setText('cTotal', list.length);
    setText('cDone', done.length);
    setText('cSoon', soon.length);
    setText('cScore', score);

    var upcoming = list.filter(function (c) { return !c.sub && c.due_at; }).slice(0, 6);
    var body = document.getElementById('chBody');
    if (!upcoming.length) {
      body.innerHTML = row(4, list.length ? '마감이 임박한 미제출 과제가 없습니다.' : '등록된 과제가 없습니다.');
      return;
    }
    body.innerHTML = upcoming.map(function (c) {
      return '<tr class="ch-click" data-id="' + c.id + '">' +
        '<td style="text-align:left;font-weight:600;">' + esc(c.title) + '</td>' +
        '<td>' + esc(c.category || '-') + '</td>' +
        '<td>' + fmtDate(c.due_at) + '</td>' +
        '<td>' + statusTag(c) + '</td>' +
      '</tr>';
    }).join('');
    bindRows(list);
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
      body.innerHTML = row(6, '해당하는 과제가 없습니다.');
      return;
    }
    body.innerHTML = list.map(function (c) {
      return '<tr class="ch-click" data-id="' + c.id + '">' +
        '<td style="text-align:left;font-weight:600;">' + esc(c.title) + '</td>' +
        '<td>' + esc(c.category || '-') + '</td>' +
        '<td>' + (c.points || 0) + '점</td>' +
        '<td>' + fmtDate(c.open_at) + '</td>' +
        '<td>' + fmtDate(c.due_at) + '</td>' +
        '<td>' + statusTag(c) + '</td>' +
      '</tr>';
    }).join('');
    bindRows(allList);
  }

  /* ================= 일정 보기 (달력) ================= */
  var calList = [], calYear, calMonth;

  async function calendar() {
    user = await require();
    if (!user) return;
    calList = await fetchData();

    var now = new Date();
    calYear = now.getFullYear();
    calMonth = now.getMonth();

    document.getElementById('calPrev').addEventListener('click', function () { shift(-1); });
    document.getElementById('calNext').addEventListener('click', function () { shift(1); });
    renderCal();
  }
  function shift(d) {
    calMonth += d;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    if (calMonth > 11) { calMonth = 0; calYear++; }
    renderCal();
  }
  function renderCal() {
    document.getElementById('calLabel').textContent = calYear + '년 ' + MON[calMonth];

    // 이 달의 마감 과제를 날짜별로 모음
    var byDay = {};
    calList.forEach(function (c) {
      if (!c.due_at) return;
      var d = new Date(c.due_at + 'T00:00:00');
      if (d.getFullYear() === calYear && d.getMonth() === calMonth) {
        (byDay[d.getDate()] = byDay[d.getDate()] || []).push(c);
      }
    });

    var first = new Date(calYear, calMonth, 1).getDay();
    var days = new Date(calYear, calMonth + 1, 0).getDate();
    var cells = ['일','월','화','수','목','금','토']
      .map(function (w) { return '<div class="cal__wd">' + w + '</div>'; });

    for (var i = 0; i < first; i++) cells.push('<div class="cal__cell is-empty"></div>');
    for (var day = 1; day <= days; day++) {
      var isToday = (todayISO() === iso(calYear, calMonth, day));
      var evs = (byDay[day] || []).map(function (c) {
        var cls = c.sub ? 'done' : (isOver(c.due_at) ? 'over' : 'todo');
        return '<span class="cal__ev ' + cls + '" data-id="' + c.id + '">' + esc(c.title) + '</span>';
      }).join('');
      cells.push('<div class="cal__cell' + (isToday ? ' is-today' : '') + '">' +
        '<span class="cal__num">' + day + '</span>' + evs + '</div>');
    }
    document.getElementById('cal').innerHTML = cells.join('');
    bindRows(calList);
  }
  function iso(y, m, d) {
    return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  }

  /* ================= 내 과제 관리 ================= */
  var mineList = [], mineFilter = 'all';

  async function mine() {
    user = await require();
    if (!user) return;
    mineList = await fetchData();   // 미제출 과제까지 전부

    var done = mineList.filter(function (c) { return c.sub; });
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
  }

  function renderMine() {
    var list = mineList.filter(function (c) {
      if (mineFilter === 'todo') return !c.sub;
      if (mineFilter === 'done') return !!c.sub;
      if (mineFilter === 'pass') return c.sub && c.sub.review_status === 'pass';
      return true;
    });
    document.getElementById('mineCount').textContent =
      list.length + ' / ' + mineList.length + '개';

    var body = document.getElementById('mineBody');
    if (!list.length) {
      body.innerHTML = row(7, mineList.length ? '해당하는 과제가 없습니다.' : '등록된 과제가 없습니다.');
      return;
    }
    body.innerHTML = list.map(function (c) {
      var review, submitted, score;
      if (!c.sub) {
        review = isOver(c.due_at)
          ? '<span class="tag tag--no">기한 지남</span>'
          : '<span class="tag tag--wait">미제출</span>';
        submitted = '-';
        score = '-';
      } else {
        review = c.sub.review_status === 'pass' ? '<span class="tag tag--ok">통과</span>'
          : c.sub.review_status === 'fail' ? '<span class="tag tag--no">미통과</span>'
          : '<span class="tag tag--wait">검수 대기</span>';
        if (c.sub.review_reason) {
          review += '<div style="font-size:0.72rem;color:var(--muted);margin-top:3px;">' +
            esc(c.sub.review_reason) + '</div>';
        }
        submitted = fmtDate(c.sub.created_at);
        score = c.sub.score != null ? c.sub.score + '점' : '-';
      }
      return '<tr class="ch-click" data-id="' + c.id + '">' +
        '<td style="text-align:left;font-weight:600;">' + esc(c.title) + '</td>' +
        '<td>' + esc(c.category || '-') + '</td>' +
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
    var d = daysLeft(c.due_at);
    var overdue = isOver(c.due_at) && !c.sub;
    var manual = c.manual || [];

    var manualHtml = manual.length
      ? '<div class="od-card__sub" style="margin-top:0;">📖 매뉴얼</div>' +
        '<div class="ch-mn__list">' +
          manual.map(function (m, i) {
            return '<a class="ch-mn" href="' + esc(m.url) + '" target="_blank">' +
              '<span class="ch-mn__n">' + (i + 1) + '</span>' +
              '<span class="ch-mn__t">' + esc(m.title) + '</span>' +
              '<span class="ch-mn__u">링크 ↗</span></a>';
          }).join('') +
        '</div>'
      : '';

    var already = c.sub && c.sub.file_name
      ? '<div class="ch-file">📎 첨부: ' + esc(c.sub.file_name) + '</div>' : '';

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
            (c.category ? '<span class="ord-chip">' + esc(c.category) + '</span>' : '') +
            '<span class="ord-chip">배점 ' + (c.points || 0) + '점</span>' +
            (c.due_at ? '<span class="ord-chip">마감 ' + fmtDate(c.due_at) +
              (d != null && d >= 0 ? ' (D-' + d + ')' : '') + '</span>' : '') +
          '</div>' +
          (c.description
            ? '<p style="white-space:pre-wrap;line-height:1.7;font-size:0.9rem;margin:14px 0;">' +
              esc(c.description) + '</p>'
            : '') +

          manualHtml +

          (c.sub && c.sub.review_status !== 'pending'
            ? '<div class="ch-review ' + (c.sub.review_status === 'pass' ? 'ok' : 'no') + '" style="margin-top:16px;">' +
                (c.sub.review_status === 'pass' ? '✅ 검수 통과' : '❌ 미통과') +
                (c.sub.score != null ? ' · ' + c.sub.score + '점' : '') +
                (c.sub.review_reason ? '<div style="margin-top:6px;font-weight:400;">' +
                  esc(c.sub.review_reason) + '</div>' : '') +
              '</div>'
            : '') +

          // ===== 별도 제출란 =====
          '<div class="ch-submit">' +
            '<div class="ch-submit__title">📤 과제 제출' +
              (c.sub ? ' <span class="tag tag--wait">제출됨</span>' : '') + '</div>' +
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
          '</div>' +
        '</div>' +
        '<div class="modal-card__foot">' +
          '<button class="btn-sm" data-close>닫기</button>' +
          (overdue ? '' :
            '<button class="btn-sm is-primary" id="chSubmit">' +
            (c.sub ? '다시 제출' : '제출하기') + '</button>') +
        '</div>' +
      '</div>';
    document.body.appendChild(box);

    box.addEventListener('click', function (e) {
      if (e.target === box || e.target.closest('[data-close]')) box.remove();
    });

    var btn = box.querySelector('#chSubmit');
    if (btn) btn.addEventListener('click', async function () {
      var content = box.querySelector('#chContent').value.trim();
      var file = box.querySelector('#chFile').files[0];
      var errEl = box.querySelector('#chErr');
      if (!content && !file) { errEl.textContent = '제출 내용이나 파일 중 하나는 입력하세요.'; return; }

      btn.disabled = true;
      errEl.textContent = '';

      var row = {
        challenge_id: c.id,
        user_id: user.id,
        content: content || null,
        status: 'submitted',
        review_status: 'pending',
        updated_at: new Date().toISOString(),
      };

      // 파일 첨부: 경로 첫 폴더가 본인 uid 여야 스토리지 정책을 통과한다
      if (file) {
        btn.textContent = '업로드 중...';
        var path = user.id + '/challenge/' + c.id + '/' + Date.now() + '_' + file.name;
        var up = await sb.storage.from('submissions').upload(path, file, { upsert: true });
        if (up.error) {
          btn.disabled = false; btn.textContent = '제출하기';
          errEl.textContent = '파일 업로드 실패: ' + up.error.message;
          return;
        }
        row.file_path = path;
        row.file_name = file.name;
      }

      var res = await sb.from('challenge_submissions')
        .upsert(row, { onConflict: 'challenge_id,user_id' });

      if (res.error) {
        btn.disabled = false; btn.textContent = '제출하기';
        errEl.textContent = '제출 실패: ' + res.error.message;
        return;
      }
      box.remove();
      location.reload();
    });
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
