/* =========================================================
   어드민 · 등급 승인
   - level_requests 신청을 승인/반려
   - 승인: profiles.level = to_level (발주&광고 개방), 신청 approved
   - 반려: 사유 입력, 신청 rejected
   ========================================================= */
(function () {
  var requests = [];
  var profById = {};     // uid → profile
  var coById = {};       // cohort id → label

  var els = {
    pendBody: document.getElementById('pendBody'),
    pendCount: document.getElementById('pendCount'),
    histBody: document.getElementById('histBody'),
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function fmt(iso) {
    if (!iso) return '-';
    var d = new Date(iso);
    return (d.getMonth() + 1) + '.' + d.getDate() + ' ' +
      String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function cohortLabel(id) { return coById[id] || (id ? id + '기' : '-'); }

  function render() {
    var pending = requests.filter(function (r) { return r.status === 'pending'; });
    var history = requests.filter(function (r) { return r.status !== 'pending'; });

    els.pendCount.textContent = pending.length ? '(' + pending.length + '건)' : '';

    els.pendBody.innerHTML = pending.length ? pending.map(function (r) {
      var p = profById[r.user_id] || {};
      return '<tr>' +
        '<td style="text-align:left;font-weight:600;">' + esc(p.name || '(이름없음)') + '</td>' +
        '<td>' + esc(p.email || '-') + '</td>' +
        '<td>' + esc(cohortLabel(p.cohort)) + '</td>' +
        '<td>' + fmt(r.created_at) + '</td>' +
        '<td>' +
          '<button class="btn-primary btn-sm" data-act="approve" data-id="' + r.id + '">승인</button> ' +
          '<button class="btn-sm" data-act="reject" data-id="' + r.id + '">반려</button>' +
        '</td>' +
      '</tr>';
    }).join('') :
      '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:40px;">대기 중인 신청이 없습니다.</td></tr>';

    els.histBody.innerHTML = history.length ? history.map(function (r) {
      var p = profById[r.user_id] || {};
      var tag = r.status === 'approved'
        ? '<span class="tag tag--ok">승인</span>'
        : '<span class="tag tag--no">반려</span>';
      return '<tr>' +
        '<td style="text-align:left;">' + esc(p.name || '(이름없음)') + '</td>' +
        '<td>' + tag + '</td>' +
        '<td style="text-align:left;color:var(--muted);">' + esc(r.note || '-') + '</td>' +
        '<td>' + fmt(r.decided_at) + '</td>' +
      '</tr>';
    }).join('') :
      '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:30px;">처리 내역이 없습니다.</td></tr>';
  }

  els.pendBody.addEventListener('click', async function (e) {
    var btn = e.target.closest('button[data-act]');
    if (!btn) return;
    var id = Number(btn.dataset.id);
    var r = requests.find(function (x) { return x.id === id; });
    if (!r) return;
    var p = profById[r.user_id] || {};

    if (btn.dataset.act === 'approve') {
      if (!confirm('"' + (p.name || '수강생') + '"님에게 발주 & 광고 훈련을 열어줄까요?')) return;
      btn.disabled = true;
      var up = await sb.from('profiles').update({ level: r.to_level || 1 }).eq('id', r.user_id);
      if (up.error) { btn.disabled = false; alert('등급 변경 실패: ' + up.error.message); return; }
      var rr = await sb.from('level_requests').update({
        status: 'approved', decided_at: new Date().toISOString()
      }).eq('id', id);
      if (rr.error) { alert('신청 상태 저장 실패: ' + rr.error.message); return; }
      await load();
      return;
    }

    if (btn.dataset.act === 'reject') {
      var note = prompt('반려 사유를 입력하세요 (수강생에게 표시됩니다):', '');
      if (note == null) return;
      btn.disabled = true;
      var d = await sb.from('level_requests').update({
        status: 'rejected', note: note.trim() || null, decided_at: new Date().toISOString()
      }).eq('id', id);
      if (d.error) { btn.disabled = false; alert('반려 실패: ' + d.error.message); return; }
      await load();
    }
  });

  async function load() {
    var co = await sb.from('cohorts').select('*');
    coById = {};
    (co.data || []).forEach(function (c) { coById[c.id] = c.label; });

    var lr = await sb.from('level_requests').select('*').order('created_at', { ascending: false });
    if (lr.error) { alert('신청을 불러오지 못했습니다: ' + lr.error.message); return; }
    requests = lr.data || [];

    profById = {};
    var pr = await sb.from('profiles').select('id, name, email, cohort');
    (pr.data || []).forEach(function (p) { profById[p.id] = p; });

    render();
  }

  (async function init() {
    var admin = await Auth.requireAdmin();
    if (!admin) return;
    await load();
  })();
})();
