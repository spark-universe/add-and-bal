/* =========================================================
   어드민 · 챌린지 공개 관리 (기수별)
   - 기수를 고르면 그 기수의 과제 목차를 순서대로 보여준다
   - 과제마다 공개 / 숨김 / 예약(open_at) 을 설정 → challenges.active / open_at
   - 수강생 화면(challenge.js)은 active=true 이고 open_at 이 지난 과제만 노출
   ========================================================= */
(function () {
  var cohort = 1;
  var challenges = [];

  var els = {
    sel: document.getElementById('cohortSel'),
    body: document.getElementById('cvBody'),
    count: document.getElementById('cvCount'),
    saved: document.getElementById('saved'),
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function fmtDate(iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    return (d.getMonth() + 1) + '.' + d.getDate();
  }
  function localToISO(v) { return v ? new Date(v).toISOString() : null; }
  function isoToLocal(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    var off = d.getTimezoneOffset() * 60000;
    return new Date(d - off).toISOString().slice(0, 16);
  }
  function flash() {
    els.saved.hidden = false;
    setTimeout(function () { els.saved.hidden = true; }, 2000);
  }

  // (active, open_at) → 상태값 / 뱃지
  function statusOf(c) {
    if (!c.active) return 'hidden';
    if (c.open_at && new Date(c.open_at).getTime() > Date.now()) return 'scheduled';
    return 'public';
  }
  function badge(c) {
    var s = statusOf(c);
    if (s === 'hidden') return '<span class="tag tag--no">숨김</span>';
    if (s === 'scheduled') {
      var days = Math.ceil((new Date(c.open_at).getTime() - Date.now()) / 86400000);
      return '<span class="tag tag--wait">예약 D-' + days + '</span>';
    }
    return '<span class="tag tag--ok">공개중</span>';
  }

  function render() {
    els.count.textContent = challenges.length ? '(' + challenges.length + '개)' : '';
    if (!challenges.length) {
      els.body.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:40px;">' +
        '이 기수에 등록된 과제가 없습니다. <a href="challenges.html" style="color:var(--primary);">챌린지 관리</a>에서 등록하세요.</td></tr>';
      return;
    }
    els.body.innerHTML = challenges.map(function (c, i) {
      var st = statusOf(c);
      var opt = function (v, label) {
        return '<option value="' + v + '"' + (st === v ? ' selected' : '') + '>' + label + '</option>';
      };
      return '<tr data-id="' + c.id + '">' +
        '<td>' + (i + 1) + '</td>' +
        '<td style="text-align:left;font-weight:600;">' + esc(c.title) + '</td>' +
        '<td>' + fmtDate(c.due_at) + '</td>' +
        '<td class="cv-badge">' + badge(c) + '</td>' +
        '<td><select class="cv-status" style="padding:6px 8px;border:1px solid var(--border);border-radius:7px;font-size:0.82rem;">' +
          opt('public', '공개') + opt('hidden', '숨김') + opt('scheduled', '예약') +
        '</select></td>' +
        '<td><input type="datetime-local" class="cv-when" value="' + isoToLocal(c.open_at) + '"' +
          (st === 'scheduled' ? '' : ' disabled') +
          ' style="padding:6px 8px;border:1px solid var(--border);border-radius:7px;font-size:0.82rem;width:100%;"></td>' +
        '<td class="cv-note" style="color:var(--muted);font-size:0.78rem;white-space:nowrap;"></td>' +
      '</tr>';
    }).join('');
  }

  // 여러 행을 고친 뒤 [모두 저장]으로 한꺼번에 저장
  var saveBtn = document.getElementById('saveAll');

  // 각 행이 로드된 값과 달라졌는지
  function rowDirty(tr) {
    var c = challenges.find(function (x) { return x.id === Number(tr.dataset.id); });
    if (!c) return false;
    var status = tr.querySelector('.cv-status').value;
    var whenVal = tr.querySelector('.cv-when').value;
    var curWhen = c.open_at ? isoToLocal(c.open_at) : '';
    return (status !== statusOf(c)) || (status === 'scheduled' && whenVal !== curWhen);
  }
  function refreshDirty() {
    var n = 0;
    els.body.querySelectorAll('tr[data-id]').forEach(function (tr) {
      var d = rowDirty(tr);
      tr.classList.toggle('row-dirty', d);
      var note = tr.querySelector('.cv-note');
      if (note) note.innerHTML = d ? '<span style="color:#b9791a;font-weight:700;">● 변경</span>' : '';
      if (d) n++;
    });
    saveBtn.textContent = n ? ('모두 저장 (' + n + ')') : '모두 저장';
    saveBtn.disabled = n === 0;
  }

  els.body.addEventListener('change', function (e) {
    var tr = e.target.closest('tr');
    if (!tr) return;
    if (e.target.classList.contains('cv-status')) {
      tr.querySelector('.cv-when').disabled = e.target.value !== 'scheduled';
    }
    refreshDirty();
  });

  saveBtn.addEventListener('click', async function () {
    var jobs = [];
    var trs = Array.prototype.slice.call(els.body.querySelectorAll('tr[data-id]'));
    for (var i = 0; i < trs.length; i++) {
      var tr = trs[i];
      if (!rowDirty(tr)) continue;
      var c = challenges.find(function (x) { return x.id === Number(tr.dataset.id); });
      var status = tr.querySelector('.cv-status').value;
      var whenVal = tr.querySelector('.cv-when').value;
      if (status === 'scheduled' && !whenVal) { alert('예약 과제에 공개일시를 지정하세요: ' + c.title); return; }
      jobs.push({ tr: tr, c: c, status: status, whenVal: whenVal });
    }
    if (!jobs.length) return;

    saveBtn.disabled = true;
    saveBtn.textContent = '저장 중...';
    for (var j = 0; j < jobs.length; j++) {
      var job = jobs[j];
      var row = job.status === 'hidden' ? { active: false }
        : job.status === 'scheduled' ? { active: true, open_at: localToISO(job.whenVal) }
        : { active: true, open_at: null };
      var res = await sb.from('challenges').update(row).eq('id', job.c.id).select();
      if (res.error) { alert('저장 실패(' + job.c.title + '): ' + res.error.message); await load(); return; }
      if (!res.data || !res.data.length) {
        alert('저장이 반영되지 않았습니다: ' + job.c.title +
          '\n(어드민 권한이 없거나 세션이 만료됐을 수 있습니다. 다시 로그인 후 시도하세요.)');
        await load(); return;
      }
    }
    await load();   // 낙관적 표시 대신 DB 실제 상태로 다시 불러와 표시
    flash();
  });

  async function loadCohorts() {
    var co = await sb.from('cohorts').select('*').order('id');
    var list = (co.data && co.data.length) ? co.data : [{ id: 1, label: '1기' }];
    els.sel.innerHTML = list.map(function (c) {
      return '<option value="' + c.id + '">' + esc(c.label) + '</option>';
    }).join('');
    // URL ?cohort= 로 초기 선택
    var q = new URLSearchParams(location.search).get('cohort');
    if (q && list.some(function (c) { return String(c.id) === q; })) cohort = Number(q);
    else if (!list.some(function (c) { return c.id === cohort; })) cohort = list[0].id;
    els.sel.value = String(cohort);
  }

  async function load() {
    var res = await sb.from('challenges').select('*')
      .eq('cohort', cohort)
      .order('due_at', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });
    if (res.error) { alert('과제를 불러오지 못했습니다: ' + res.error.message); return; }
    challenges = res.data || [];
    render();
    refreshDirty();
  }

  els.sel.addEventListener('change', function () {
    cohort = parseInt(this.value, 10) || 1;
    load();
  });

  (async function init() {
    var admin = await Auth.requireAdmin();
    if (!admin) return;
    await loadCohorts();
    await load();
  })();
})();
