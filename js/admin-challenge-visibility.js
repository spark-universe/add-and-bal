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
        '<td><button class="btn-sm" data-save="' + c.id + '">저장</button></td>' +
      '</tr>';
    }).join('');
  }

  els.body.addEventListener('change', function (e) {
    var sel = e.target.closest('.cv-status');
    if (!sel) return;
    var when = sel.closest('tr').querySelector('.cv-when');
    when.disabled = sel.value !== 'scheduled';
  });

  els.body.addEventListener('click', async function (e) {
    var btn = e.target.closest('button[data-save]');
    if (!btn) return;
    var id = Number(btn.dataset.save);
    var tr = btn.closest('tr');
    var status = tr.querySelector('.cv-status').value;
    var whenVal = tr.querySelector('.cv-when').value;

    if (status === 'scheduled' && !whenVal) { alert('예약 상태에는 공개일시를 지정해야 합니다.'); return; }

    var row;
    if (status === 'hidden') row = { active: false };
    else if (status === 'scheduled') row = { active: true, open_at: localToISO(whenVal) };
    else row = { active: true, open_at: null };   // 공개(즉시)

    btn.disabled = true;
    var res = await sb.from('challenges').update(row).eq('id', id);
    btn.disabled = false;
    if (res.error) { alert('저장 실패: ' + res.error.message); return; }

    var c = challenges.find(function (x) { return x.id === id; });
    if (c) { c.active = (row.active !== false); c.open_at = ('open_at' in row) ? row.open_at : c.open_at; }
    tr.querySelector('.cv-badge').innerHTML = badge(c);
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
