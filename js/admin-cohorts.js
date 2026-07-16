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
    newEnroll: document.getElementById('newEnroll'),
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
      els.body.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:40px;">' +
        '등록된 기수가 없습니다.</td></tr>';
      return;
    }
    els.body.innerHTML = cohorts.map(function (c) {
      var n = countByCohort[c.id] || 0;
      return '<tr' + (c.active ? '' : ' style="opacity:0.5;"') + '>' +
        '<td>' + c.id + '</td>' +
        '<td style="text-align:left;"><b>' + esc(c.label) + '</b></td>' +
        '<td style="text-align:left;">' +
          '<input type="date" class="co-enroll" data-id="' + c.id + '" value="' + esc(c.enroll_date || '') +
          '" style="padding:5px 8px;border:1px solid var(--border);border-radius:7px;font-size:0.82rem;"></td>' +
        '<td>' + n + '명</td>' +
        '<td><button class="btn-sm" data-act="toggle" data-id="' + c.id + '">' +
          (c.active ? '노출중' : '숨김') + '</button></td>' +
        '<td>' +
          '<a class="btn-link" href="challenge-visibility.html?cohort=' + c.id + '">챌린지 공개</a> ' +
          '<button class="btn-link" data-act="rename" data-id="' + c.id + '">이름 변경</button> ' +
          '<button class="btn-link danger" data-act="del" data-id="' + c.id + '">삭제</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  els.addBtn.addEventListener('click', async function () {
    var label = els.newLabel.value.trim();
    if (!label) { alert('기수 이름을 입력하세요.'); return; }
    var nextId = cohorts.reduce(function (m, c) { return Math.max(m, c.id); }, 0) + 1;

    var enroll = els.newEnroll.value.trim() || null;
    els.addBtn.disabled = true;
    var res = await sb.from('cohorts').insert({ id: nextId, label: label, enroll_date: enroll });
    els.addBtn.disabled = false;
    if (res.error) { alert('추가 실패: ' + res.error.message); return; }
    els.newLabel.value = '';
    els.newEnroll.value = '';
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
      var label = prompt('기수 이름(어드민 전용)을 입력하세요:', c.label);
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
      return;
    }
    if (btn.dataset.act === 'del') { openDelete(c); return; }
  });

  /* ---------- 기수 삭제 ---------- */
  var delModal = document.getElementById('delModal');
  var delEls = {
    info: document.getElementById('delInfo'),
    moveWrap: document.getElementById('delMoveWrap'),
    target: document.getElementById('delTarget'),
    empty: document.getElementById('delEmpty'),
    unassign: document.getElementById('delUnassign'),
    move: document.getElementById('delMove'),
    cancel: document.getElementById('delCancel'),
    close: document.getElementById('delClose'),
  };
  var delId = null, delHw = 0;

  function closeDel() { delModal.classList.remove('is-open'); delId = null; }
  delEls.cancel.addEventListener('click', closeDel);
  delEls.close.addEventListener('click', closeDel);
  delModal.addEventListener('click', function (e) { if (e.target === delModal) closeDel(); });

  async function openDelete(c) {
    if (cohorts.length <= 1) { alert('기수가 하나뿐이라 삭제할 수 없습니다.'); return; }
    delId = c.id;
    var students = countByCohort[c.id] || 0;
    var hw = await sb.from('challenges').select('id', { count: 'exact', head: true }).eq('cohort', c.id);
    delHw = hw.count || 0;

    delEls.info.innerHTML = '<b>' + esc(c.label) + '</b> 기수를 삭제합니다.<br>' +
      '학생 <b>' + students + '명</b>, 숙제 <b>' + delHw + '개</b>.';

    // 버튼/이동옵션 표시 결정
    delEls.empty.hidden = students > 0;
    delEls.unassign.hidden = students === 0;
    delEls.move.hidden = students === 0;
    delEls.moveWrap.hidden = students === 0;

    if (students > 0) {
      var others = cohorts.filter(function (x) { return x.id !== c.id; });
      delEls.target.innerHTML = others.map(function (x) {
        return '<option value="' + x.id + '">' + esc(x.label) + (x.enroll_date ? ' · ' + esc(x.enroll_date) : '') + '</option>';
      }).join('');
      delEls.info.innerHTML += '<br><span style="color:var(--muted);font-size:0.85rem;">' +
        '· 이동 후 삭제: 학생을 고른 기수로 옮기고(그 기수 숙제를 봄), 이 기수 숙제는 삭제<br>' +
        '· 미분류로 삭제: 학생·숙제를 미분류로 두고 기수만 삭제</span>';
    } else {
      delEls.info.innerHTML += '<br><span style="color:var(--muted);font-size:0.85rem;">학생이 없어 숙제와 함께 바로 삭제됩니다.</span>';
    }
    delModal.classList.add('is-open');
  }

  async function finishDelete() { closeDel(); await load(); }

  // 학생 없음 → 기수 + 숙제 삭제
  delEls.empty.addEventListener('click', async function () {
    var id = delId; if (id == null) return;
    var dh = await sb.from('challenges').delete().eq('cohort', id);
    if (dh.error) { alert('숙제 삭제 실패: ' + dh.error.message); return; }
    var dc = await sb.from('cohorts').delete().eq('id', id);
    if (dc.error) { alert('기수 삭제 실패: ' + dc.error.message); return; }
    await finishDelete();
  });

  // 다른 기수로 이동 후 삭제
  delEls.move.addEventListener('click', async function () {
    var id = delId; if (id == null) return;
    var target = Number(delEls.target.value);
    if (!target) { alert('옮길 기수를 고르세요.'); return; }
    if (!confirm('학생을 "' + (cohorts.find(function (x){return x.id===target;})||{}).label + '"(으)로 옮기고 이 기수를 삭제할까요?\n이 기수의 숙제·제출물은 삭제됩니다.')) return;
    var mp = await sb.from('profiles').update({ cohort: target }).eq('cohort', id);
    if (mp.error) { alert('학생 이동 실패: ' + mp.error.message); return; }
    var dh = await sb.from('challenges').delete().eq('cohort', id);
    if (dh.error) { alert('숙제 삭제 실패: ' + dh.error.message); return; }
    var dc = await sb.from('cohorts').delete().eq('id', id);
    if (dc.error) { alert('기수 삭제 실패: ' + dc.error.message); return; }
    await finishDelete();
  });

  // 미분류로 삭제 (학생·숙제 cohort=0)
  delEls.unassign.addEventListener('click', async function () {
    var id = delId; if (id == null) return;
    if (!confirm('학생과 숙제를 미분류로 두고 이 기수를 삭제할까요?')) return;
    var mp = await sb.from('profiles').update({ cohort: 0 }).eq('cohort', id);
    if (mp.error) { alert('학생 미분류 처리 실패: ' + mp.error.message); return; }
    var mh = await sb.from('challenges').update({ cohort: 0 }).eq('cohort', id);
    if (mh.error) { alert('숙제 미분류 처리 실패: ' + mh.error.message); return; }
    var dc = await sb.from('cohorts').delete().eq('id', id);
    if (dc.error) { alert('기수 삭제 실패: ' + dc.error.message); return; }
    await finishDelete();
  });

  // 수강일(날짜) 즉시 저장
  els.body.addEventListener('change', async function (e) {
    var inp = e.target.closest('.co-enroll');
    if (!inp) return;
    var id = Number(inp.dataset.id);
    var val = inp.value || null;   // 'YYYY-MM-DD' 또는 빈값
    var r = await sb.from('cohorts').update({ enroll_date: val }).eq('id', id).select();
    if (r.error || !r.data || !r.data.length) {
      alert('수강일 저장 실패' + (r.error ? ': ' + r.error.message : ''));
      return;
    }
    var c = cohorts.find(function (x) { return x.id === id; });
    if (c) c.enroll_date = val;
    flash();
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
