/* =========================================================
   어드민 · 챌린지 관리
   - challenges 테이블 CRUD (등록 / 수정 / 표시토글 / 삭제)
   - 각 과제의 제출 건수도 함께 보여줌
   - 검수는 별도 화면(challenge-review.html)
   ========================================================= */
(function () {
  var editingId = null;
  var challenges = [];
  var subCount = {};   // challenge_id → 제출 건수

  var els = {
    title: document.getElementById('fTitle'),
    desc: document.getElementById('fDesc'),
    category: document.getElementById('fCategory'),
    points: document.getElementById('fPoints'),
    open: document.getElementById('fOpen'),
    due: document.getElementById('fDue'),
    saveBtn: document.getElementById('saveBtn'),
    saved: document.getElementById('saved'),
    formTitle: document.getElementById('formTitle'),
    cancelEdit: document.getElementById('cancelEdit'),
    body: document.getElementById('chBody'),
    count: document.getElementById('chCount'),
    catList: document.getElementById('catList'),
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function fmtDate(iso) { return iso ? iso.slice(0, 10).replace(/-/g, '.') : '-'; }

  function readForm() {
    return {
      title: els.title.value.trim(),
      description: els.desc.value.trim() || null,
      category: els.category.value.trim() || null,
      points: parseInt(els.points.value, 10) || 0,
      open_at: els.open.value || null,
      due_at: els.due.value || null,
    };
  }
  function clearForm() {
    editingId = null;
    els.title.value = els.desc.value = els.category.value = els.points.value = els.open.value = els.due.value = '';
    els.formTitle.textContent = '과제 등록';
    els.saveBtn.textContent = '등록하기';
    els.cancelEdit.hidden = true;
  }
  function fillForm(c) {
    editingId = c.id;
    els.title.value = c.title || '';
    els.desc.value = c.description || '';
    els.category.value = c.category || '';
    els.points.value = c.points != null ? c.points : '';
    els.open.value = c.open_at || '';
    els.due.value = c.due_at || '';
    els.formTitle.textContent = '과제 수정 — ' + c.title;
    els.saveBtn.textContent = '수정 저장';
    els.cancelEdit.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function flash() {
    els.saved.hidden = false;
    setTimeout(function () { els.saved.hidden = true; }, 2000);
  }

  function render() {
    els.count.textContent = challenges.length ? '(' + challenges.length + '개)' : '';

    // 분류 자동완성
    var cats = {};
    challenges.forEach(function (c) { if (c.category) cats[c.category] = true; });
    els.catList.innerHTML = Object.keys(cats).map(function (c) {
      return '<option value="' + esc(c) + '">';
    }).join('');

    if (!challenges.length) {
      els.body.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:40px;">' +
        '등록된 과제가 없습니다. 위 폼으로 과제를 등록하세요.</td></tr>';
      return;
    }
    els.body.innerHTML = challenges.map(function (c) {
      var n = subCount[c.id] || 0;
      return '<tr' + (c.active ? '' : ' style="opacity:0.45;"') + '>' +
        '<td style="text-align:left;font-weight:600;max-width:320px;">' + esc(c.title) + '</td>' +
        '<td>' + esc(c.category || '-') + '</td>' +
        '<td>' + (c.points || 0) + '점</td>' +
        '<td>' + fmtDate(c.due_at) + '</td>' +
        '<td>' + (n ? '<a href="challenge-review.html?id=' + c.id + '" style="color:var(--primary);">' + n + '건</a>' : '0건') + '</td>' +
        '<td><button class="btn-sm" data-act="toggle" data-id="' + c.id + '">' +
          (c.active ? '표시중' : '숨김') + '</button></td>' +
        '<td>' +
          '<button class="btn-link" data-act="edit" data-id="' + c.id + '">수정</button> ' +
          '<button class="btn-link danger" data-act="del" data-id="' + c.id + '">삭제</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  async function load() {
    var res = await sb.from('challenges').select('*').order('created_at', { ascending: false });
    if (res.error) { alert('과제를 불러오지 못했습니다: ' + res.error.message); return; }
    challenges = res.data || [];

    // 제출 건수 집계
    subCount = {};
    var su = await sb.from('challenge_submissions').select('challenge_id');
    (su.data || []).forEach(function (s) {
      subCount[s.challenge_id] = (subCount[s.challenge_id] || 0) + 1;
    });
    render();
  }

  els.saveBtn.addEventListener('click', async function () {
    var row = readForm();
    if (!row.title) { alert('과제 제목을 입력하세요.'); return; }
    if (row.open_at && row.due_at && row.due_at < row.open_at) {
      alert('마감일이 시작일보다 빠릅니다.'); return;
    }

    els.saveBtn.disabled = true;
    var res = editingId
      ? await sb.from('challenges').update(row).eq('id', editingId)
      : await sb.from('challenges').insert(row);
    els.saveBtn.disabled = false;

    if (res.error) { alert('저장 실패: ' + res.error.message); return; }
    clearForm();
    flash();
    await load();
  });

  els.cancelEdit.addEventListener('click', clearForm);

  els.body.addEventListener('click', async function (e) {
    var btn = e.target.closest('button[data-act]');
    if (!btn) return;
    var id = Number(btn.dataset.id);
    var c = challenges.find(function (x) { return x.id === id; });
    if (!c) return;

    if (btn.dataset.act === 'edit') { fillForm(c); return; }

    if (btn.dataset.act === 'toggle') {
      var r = await sb.from('challenges').update({ active: !c.active }).eq('id', id);
      if (r.error) { alert('변경 실패: ' + r.error.message); return; }
      await load();
      return;
    }

    if (btn.dataset.act === 'del') {
      var n = subCount[id] || 0;
      var msg = n
        ? '정말로 삭제하시겠습니까?\n\n"' + c.title + '"\n제출된 ' + n + '건도 함께 삭제됩니다.'
        : '정말로 삭제하시겠습니까?\n\n"' + c.title + '"';
      if (!confirm(msg)) return;
      var d = await sb.from('challenges').delete().eq('id', id);
      if (d.error) { alert('삭제 실패: ' + d.error.message); return; }
      if (editingId === id) clearForm();
      await load();
    }
  });

  (async function init() {
    var admin = await Auth.requireAdmin();
    if (!admin) return;
    await load();
  })();
})();
