/* =========================================================
   어드민 · 매뉴얼 공개 관리 (기수별)
   - manual_chapters = 챕터 목록(제목/순서)
   - cohort_manual   = 기수별 챕터 공개/예약 (cohort, slug, status, publish_at)
   - 행이 없으면 기본 공개. 매뉴얼 본문은 정적(manual.html), 여기선 "언제 보일지"만 제어
   ========================================================= */
(function () {
  var cohort = 1;
  var catalog = [];        // manual_chapters (slug, title, sort)
  var chapters = [];       // 카탈로그 + 현재 기수 오버라이드 병합 (slug, title, sort, status, publish_at)

  var els = {
    sel: document.getElementById('cohortSel'),
    body: document.getElementById('mcBody'),
    count: document.getElementById('mcCount'),
    saved: document.getElementById('saved'),
    saveBtn: document.getElementById('saveAll'),
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
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

  function currentBadge(c) {
    if (c.status === 'hidden') return '<span class="tag tag--no">숨김</span>';
    if (c.status === 'scheduled') {
      if (!c.publish_at) return '<span class="tag tag--wait">예약(날짜 미정)</span>';
      var t = new Date(c.publish_at).getTime();
      if (t <= Date.now()) return '<span class="tag tag--ok">공개중</span>';
      var days = Math.ceil((t - Date.now()) / 86400000);
      return '<span class="tag tag--wait">예약 D-' + days + '</span>';
    }
    return '<span class="tag tag--ok">공개중</span>';
  }

  function render() {
    els.count.textContent = chapters.length ? '(' + chapters.length + '개)' : '';
    els.body.innerHTML = chapters.map(function (c) {
      var opt = function (v, label) {
        return '<option value="' + v + '"' + (c.status === v ? ' selected' : '') + '>' + label + '</option>';
      };
      return '<tr data-slug="' + c.slug + '">' +
        '<td>' + (c.sort || '') + '</td>' +
        '<td style="text-align:left;font-weight:600;">' + esc(c.title) +
          ' <span style="color:var(--muted);font-weight:400;font-size:0.8rem;">#' + esc(c.slug) + '</span></td>' +
        '<td class="mc-badge">' + currentBadge(c) + '</td>' +
        '<td><select class="mc-status" style="padding:6px 8px;border:1px solid var(--border);border-radius:7px;font-size:0.82rem;">' +
          opt('public', '공개') + opt('hidden', '숨김') + opt('scheduled', '예약') +
        '</select></td>' +
        '<td><input type="datetime-local" class="mc-when" value="' + isoToLocal(c.publish_at) + '"' +
          (c.status === 'scheduled' ? '' : ' disabled') +
          ' style="padding:6px 8px;border:1px solid var(--border);border-radius:7px;font-size:0.82rem;width:100%;"></td>' +
        '<td class="mc-note" style="color:var(--muted);font-size:0.78rem;white-space:nowrap;"></td>' +
      '</tr>';
    }).join('');
    refreshDirty();
  }

  function rowDirty(tr) {
    var c = chapters.find(function (x) { return x.slug === tr.dataset.slug; });
    if (!c) return false;
    var status = tr.querySelector('.mc-status').value;
    var whenVal = tr.querySelector('.mc-when').value;
    var curWhen = c.publish_at ? isoToLocal(c.publish_at) : '';
    return (status !== c.status) || (status === 'scheduled' && whenVal !== curWhen);
  }
  function refreshDirty() {
    var n = 0;
    els.body.querySelectorAll('tr[data-slug]').forEach(function (tr) {
      var d = rowDirty(tr);
      tr.classList.toggle('row-dirty', d);
      var note = tr.querySelector('.mc-note');
      if (note) note.innerHTML = d ? '<span style="color:#b9791a;font-weight:700;">● 변경</span>' : '';
      if (d) n++;
    });
    els.saveBtn.textContent = n ? ('모두 저장 (' + n + ')') : '모두 저장';
    els.saveBtn.disabled = n === 0;
  }

  els.body.addEventListener('change', function (e) {
    var tr = e.target.closest('tr');
    if (!tr) return;
    if (e.target.classList.contains('mc-status')) {
      tr.querySelector('.mc-when').disabled = e.target.value !== 'scheduled';
    }
    refreshDirty();
  });

  els.saveBtn.addEventListener('click', async function () {
    var jobs = [];
    var trs = Array.prototype.slice.call(els.body.querySelectorAll('tr[data-slug]'));
    for (var i = 0; i < trs.length; i++) {
      var tr = trs[i];
      if (!rowDirty(tr)) continue;
      var c = chapters.find(function (x) { return x.slug === tr.dataset.slug; });
      var status = tr.querySelector('.mc-status').value;
      var whenVal = tr.querySelector('.mc-when').value;
      if (status === 'scheduled' && !whenVal) { alert('예약 챕터에 공개일시를 지정하세요: ' + c.title); return; }
      jobs.push({ slug: c.slug, title: c.title,
        status: status, publish_at: status === 'scheduled' ? localToISO(whenVal) : null });
    }
    if (!jobs.length) return;

    els.saveBtn.disabled = true;
    els.saveBtn.textContent = '저장 중...';
    var rows = jobs.map(function (j) {
      return { cohort: cohort, slug: j.slug, status: j.status, publish_at: j.publish_at,
        updated_at: new Date().toISOString() };
    });
    var res = await sb.from('cohort_manual').upsert(rows, { onConflict: 'cohort,slug' }).select();
    if (res.error) { alert('저장 실패: ' + res.error.message); await load(); return; }
    if (!res.data || res.data.length < rows.length) {
      alert('일부 저장이 반영되지 않았습니다. (어드민 권한/세션 확인)'); await load(); return;
    }
    await load();
    flash();
  });

  // 기수별 오버라이드를 병합해서 chapters 구성
  async function loadSchedule() {
    var res = await sb.from('cohort_manual').select('*').eq('cohort', cohort);
    if (res.error) {
      els.body.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--danger);padding:40px;">' +
        '불러오기 실패: ' + esc(res.error.message) + '<br>setup.sql 을 실행했는지 확인하세요.</td></tr>';
      return;
    }
    var ov = {};
    (res.data || []).forEach(function (r) { ov[r.slug] = r; });
    chapters = catalog.map(function (c) {
      var o = ov[c.slug];
      return { slug: c.slug, title: c.title, sort: c.sort,
        status: o ? o.status : 'public', publish_at: o ? o.publish_at : null };
    });
    render();
  }

  async function loadCohorts() {
    var co = await sb.from('cohorts').select('*').order('id');
    var list = (co.data && co.data.length) ? co.data : [{ id: 1, label: '1기' }];
    els.sel.innerHTML = list.map(function (c) {
      return '<option value="' + c.id + '">' + esc(c.label) +
        (c.enroll_date ? ' · ' + esc(c.enroll_date) : '') + '</option>';
    }).join('');
    if (!list.some(function (c) { return c.id === cohort; })) cohort = list[0].id;
    els.sel.value = String(cohort);
  }

  async function load() {
    var cat = await sb.from('manual_chapters').select('slug, title, sort').order('sort');
    if (cat.error) {
      els.body.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--danger);padding:40px;">' +
        '불러오기 실패: ' + esc(cat.error.message) + '<br>setup.sql 을 실행했는지 확인하세요.</td></tr>';
      return;
    }
    catalog = cat.data || [];
    if (!catalog.length) {
      els.body.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:40px;">' +
        '챕터가 없습니다. setup.sql 을 실행하면 18개 챕터가 등록됩니다.</td></tr>';
      return;
    }
    await loadSchedule();
  }

  els.sel.addEventListener('change', function () {
    cohort = parseInt(this.value, 10) || 1;
    loadSchedule();
  });

  (async function init() {
    var admin = await Auth.requireAdmin();
    if (!admin) return;
    await loadCohorts();
    await load();
  })();
})();
