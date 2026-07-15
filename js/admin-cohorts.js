/* =========================================================
   어드민 · 기수(코호트) 관리
   - cohorts 테이블 CRUD (번호는 자동, 이름은 어드민이 지정)
   - 수강생 수는 profiles.cohort 로 집계
   - 삭제는 막고(배정된 수강생/과제 보호) 노출 토글만 제공
   ========================================================= */
(function () {
  var cohorts = [];
  var countByCohort = {};   // 기수번호 → 수강생 수

  var els = {
    newLabel: document.getElementById('newLabel'),
    addBtn: document.getElementById('addBtn'),
    saved: document.getElementById('saved'),
    body: document.getElementById('coBody'),
    count: document.getElementById('coCount'),
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function flash() {
    els.saved.hidden = false;
    setTimeout(function () { els.saved.hidden = true; }, 2000);
  }

  function render() {
    els.count.textContent = cohorts.length ? '(' + cohorts.length + '개)' : '';
    if (!cohorts.length) {
      els.body.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:40px;">' +
        '등록된 기수가 없습니다.</td></tr>';
      return;
    }
    els.body.innerHTML = cohorts.map(function (c) {
      var n = countByCohort[c.id] || 0;
      return '<tr' + (c.active ? '' : ' style="opacity:0.5;"') + '>' +
        '<td>' + c.id + '</td>' +
        '<td style="text-align:left;"><b>' + esc(c.label) + '</b></td>' +
        '<td>' + n + '명</td>' +
        '<td><button class="btn-sm" data-act="toggle" data-id="' + c.id + '">' +
          (c.active ? '노출중' : '숨김') + '</button></td>' +
        '<td><button class="btn-link" data-act="rename" data-id="' + c.id + '">이름 변경</button></td>' +
      '</tr>';
    }).join('');
  }

  els.addBtn.addEventListener('click', async function () {
    var label = els.newLabel.value.trim();
    if (!label) { alert('기수 이름을 입력하세요.'); return; }
    var nextId = cohorts.reduce(function (m, c) { return Math.max(m, c.id); }, 0) + 1;

    els.addBtn.disabled = true;
    var res = await sb.from('cohorts').insert({ id: nextId, label: label });
    els.addBtn.disabled = false;
    if (res.error) { alert('추가 실패: ' + res.error.message); return; }
    els.newLabel.value = '';
    flash();
    await load();
  });

  els.body.addEventListener('click', async function (e) {
    var btn = e.target.closest('button[data-act]');
    if (!btn) return;
    var id = Number(btn.dataset.id);
    var c = cohorts.find(function (x) { return x.id === id; });
    if (!c) return;

    if (btn.dataset.act === 'rename') {
      var label = prompt('기수 이름을 입력하세요:', c.label);
      if (label == null) return;
      label = label.trim();
      if (!label) { alert('이름은 비울 수 없습니다.'); return; }
      var r = await sb.from('cohorts').update({ label: label }).eq('id', id);
      if (r.error) { alert('변경 실패: ' + r.error.message); return; }
      await load();
      return;
    }
    if (btn.dataset.act === 'toggle') {
      var t = await sb.from('cohorts').update({ active: !c.active }).eq('id', id);
      if (t.error) { alert('변경 실패: ' + t.error.message); return; }
      await load();
    }
  });

  async function load() {
    var res = await sb.from('cohorts').select('*').order('id');
    if (res.error) { alert('기수를 불러오지 못했습니다: ' + res.error.message); return; }
    cohorts = res.data || [];

    countByCohort = {};
    var pr = await sb.from('profiles').select('cohort').neq('role', 'admin');
    (pr.data || []).forEach(function (p) {
      var k = p.cohort || 1;
      countByCohort[k] = (countByCohort[k] || 0) + 1;
    });
    render();
  }

  (async function init() {
    var admin = await Auth.requireAdmin();
    if (!admin) return;
    await load();
  })();
})();
