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

  // 상태/날짜를 바꾸면 즉시 저장 (별도 저장 버튼 없음)
  async function saveRow(tr) {
    var slug = tr.dataset.slug;
    var status = tr.querySelector('.mc-status').value;
    var whenVal = tr.querySelector('.mc-when').value;
    var note = tr.querySelector('.mc-note');

    if (status === 'scheduled' && !whenVal) return;   // 날짜 입력을 기다림

    var row = {
      status: status,
      publish_at: status === 'scheduled' ? localToISO(whenVal) : null,
      updated_at: new Date().toISOString(),
    };
    if (note) note.textContent = '저장 중...';
    var res = await sb.from('manual_chapters').update(row).eq('slug', slug);
    if (res.error) { if (note) note.textContent = ''; alert('저장 실패: ' + res.error.message); return; }

    var c = chapters.find(function (x) { return x.slug === slug; });
    if (c) { c.status = row.status; c.publish_at = row.publish_at; }
    tr.querySelector('.mc-badge').innerHTML = currentBadge(c);
    if (note) {
      note.textContent = '✓ 저장됨';
      setTimeout(function () { if (note.textContent === '✓ 저장됨') note.textContent = ''; }, 1800);
    }
    flash();
  }

  els.body.addEventListener('change', function (e) {
    var tr = e.target.closest('tr');
    if (!tr) return;
    if (e.target.classList.contains('mc-status')) {
      var when = tr.querySelector('.mc-when');
      when.disabled = e.target.value !== 'scheduled';
      if (e.target.value === 'scheduled' && !when.value) { when.focus(); return; }
      saveRow(tr);
    } else if (e.target.classList.contains('mc-when')) {
      saveRow(tr);
    }
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
  }

  (async function init() {
    var admin = await Auth.requireAdmin();
    if (!admin) return;
    await load();
  })();
})();
