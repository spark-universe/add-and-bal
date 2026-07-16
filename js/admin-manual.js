/* =========================================================
   어드민 · 매뉴얼 공개 관리
   - manual_chapters 의 챕터별 status(public/hidden/scheduled) + publish_at 관리
   - 매뉴얼 본문 자체는 정적(manual.html). 여기서는 "언제 보일지"만 제어
   ========================================================= */
(function () {
  var chapters = [];

  var els = {
    body: document.getElementById('mcBody'),
    count: document.getElementById('mcCount'),
    saved: document.getElementById('saved'),
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

  // 지금 기준 실제로 보이는지 + 상태 뱃지
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
  }

  // 여러 챕터를 고친 뒤 [모두 저장]으로 한꺼번에 저장
  var saveBtn = document.getElementById('saveAll');

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
    saveBtn.textContent = n ? ('모두 저장 (' + n + ')') : '모두 저장';
    saveBtn.disabled = n === 0;
  }

  els.body.addEventListener('change', function (e) {
    var tr = e.target.closest('tr');
    if (!tr) return;
    if (e.target.classList.contains('mc-status')) {
      tr.querySelector('.mc-when').disabled = e.target.value !== 'scheduled';
    }
    refreshDirty();
  });

  saveBtn.addEventListener('click', async function () {
    var jobs = [];
    var trs = Array.prototype.slice.call(els.body.querySelectorAll('tr[data-slug]'));
    for (var i = 0; i < trs.length; i++) {
      var tr = trs[i];
      if (!rowDirty(tr)) continue;
      var c = chapters.find(function (x) { return x.slug === tr.dataset.slug; });
      var status = tr.querySelector('.mc-status').value;
      var whenVal = tr.querySelector('.mc-when').value;
      if (status === 'scheduled' && !whenVal) { alert('예약 챕터에 공개일시를 지정하세요: ' + c.title); return; }
      jobs.push({ tr: tr, c: c, status: status, whenVal: whenVal });
    }
    if (!jobs.length) return;

    saveBtn.disabled = true;
    saveBtn.textContent = '저장 중...';
    for (var j = 0; j < jobs.length; j++) {
      var job = jobs[j];
      var row = {
        status: job.status,
        publish_at: job.status === 'scheduled' ? localToISO(job.whenVal) : null,
        updated_at: new Date().toISOString(),
      };
      var res = await sb.from('manual_chapters').update(row).eq('slug', job.c.slug).select();
      if (res.error) { alert('저장 실패(' + job.c.title + '): ' + res.error.message); await load(); return; }
      if (!res.data || !res.data.length) {
        alert('저장이 반영되지 않았습니다: ' + job.c.title +
          '\n(어드민 권한이 없거나 세션이 만료됐을 수 있습니다. 다시 로그인 후 시도하세요.)');
        await load(); return;
      }
    }
    await load();
    flash();
  });

  async function load() {
    var res = await sb.from('manual_chapters').select('*').order('sort');
    if (res.error) {
      els.body.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--danger);padding:40px;">' +
        '불러오기 실패: ' + esc(res.error.message) + '<br>setup.sql 을 실행했는지 확인하세요.</td></tr>';
      return;
    }
    chapters = res.data || [];
    if (!chapters.length) {
      els.body.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:40px;">' +
        '챕터가 없습니다. setup.sql 을 실행하면 18개 챕터가 등록됩니다.</td></tr>';
      return;
    }
    render();
    refreshDirty();
  }

  (async function init() {
    var admin = await Auth.requireAdmin();
    if (!admin) return;
    await load();
  })();
})();
