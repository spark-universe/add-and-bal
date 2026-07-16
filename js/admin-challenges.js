/* =========================================================
   어드민 · 숙제 관리
   - challenges 테이블 CRUD (등록 / 수정 / 표시토글 / 삭제)
   - 각 숙제의 제출 건수, 연결된 매뉴얼 챕터 표시
   - 검수는 별도 화면(challenge-review.html)
   ========================================================= */
(function () {
  var editingId = null;
  var challenges = [];      // 현재 기수의 숙제만
  var subCount = {};        // challenge_id → 제출 건수
  var cohort = 1;           // 지금 관리 중인 기수
  var maxCohort = 1;        // 존재하는 최대 기수
  var manualChapters = [];  // 매뉴얼 챕터 목록 (연결용)

  var els = {
    title: document.getElementById('fTitle'),
    desc: document.getElementById('fDesc'),
    manual: document.getElementById('fManual'),
    open: document.getElementById('fOpen'),
    due: document.getElementById('fDue'),
    saveBtn: document.getElementById('saveBtn'),
    saved: document.getElementById('saved'),
    formTitle: document.getElementById('formTitle'),
    cancelEdit: document.getElementById('cancelEdit'),
    body: document.getElementById('chBody'),
    count: document.getElementById('chCount'),
  };

  function manualTitle(slug) {
    var m = manualChapters.find(function (x) { return x.slug === slug; });
    return m ? m.title : slug;
  }

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

  // datetime-local 값(로컬시간)을 저장용 ISO로, 반대로도 변환
  function localToISO(v) { return v ? new Date(v).toISOString() : null; }
  function isoToLocal(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    var off = d.getTimezoneOffset() * 60000;
    return new Date(d - off).toISOString().slice(0, 16);
  }

  function readForm() {
    return {
      title: els.title.value.trim(),
      description: els.desc.value.trim() || null,
      manual_slug: els.manual.value || null,
      cohort: cohort,                    // 지금 선택된 기수로 등록
      open_at: localToISO(els.open.value),
      due_at: localToISO(els.due.value),
    };
  }
  function clearForm() {
    editingId = null;
    els.title.value = els.desc.value = els.open.value = els.due.value = '';
    els.manual.value = '';
    els.formTitle.textContent = '숙제 등록';
    els.saveBtn.textContent = '등록하기';
    els.cancelEdit.hidden = true;
  }
  function fillForm(c) {
    editingId = c.id;
    els.title.value = c.title || '';
    els.desc.value = c.description || '';
    els.manual.value = c.manual_slug || '';
    els.open.value = isoToLocal(c.open_at);
    els.due.value = isoToLocal(c.due_at);
    els.formTitle.textContent = '숙제 수정 — ' + c.title;
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

    if (!challenges.length) {
      els.body.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:40px;">' +
        '등록된 숙제가 없습니다. 위 폼으로 숙제를 등록하세요.</td></tr>';
      return;
    }
    els.body.innerHTML = challenges.map(function (c) {
      var n = subCount[c.id] || 0;
      return '<tr' + (c.active ? '' : ' style="opacity:0.45;"') + '>' +
        '<td style="text-align:left;font-weight:600;max-width:300px;">' + esc(c.title) + '</td>' +
        '<td>' + (c.manual_slug ? '📘 ' + esc(manualTitle(c.manual_slug)) : '<span style="color:var(--muted);">-</span>') + '</td>' +
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
    var res = await sb.from('challenges').select('*')
      .eq('cohort', cohort).order('created_at', { ascending: false });
    if (res.error) { alert('숙제를 불러오지 못했습니다: ' + res.error.message); return; }
    challenges = res.data || [];

    // 제출 건수 집계
    subCount = {};
    var su = await sb.from('challenge_submissions').select('challenge_id');
    (su.data || []).forEach(function (s) {
      subCount[s.challenge_id] = (subCount[s.challenge_id] || 0) + 1;
    });
    render();
  }

  // 기수 목록을 cohorts 테이블에서 읽어 드롭다운을 채운다 (라벨 표시)
  var cohortList = [];
  async function loadCohorts() {
    var co = await sb.from('cohorts').select('*').order('id');
    cohortList = (co.data && co.data.length) ? co.data : [{ id: 1, label: '1기' }];
    maxCohort = cohortList.reduce(function (m, c) { return Math.max(m, c.id); }, 1);

    var sel = document.getElementById('cohortSel');
    sel.innerHTML = cohortList.map(function (c) {
      return '<option value="' + c.id + '">' + esc(c.label) +
        (c.enroll_date ? ' · ' + esc(c.enroll_date) : '') + '</option>';
    }).join('');
    if (!cohortList.some(function (c) { return c.id === cohort; })) cohort = cohortList[0].id;
    sel.value = String(cohort);
  }

  document.getElementById('cohortSel').addEventListener('change', function () {
    cohort = parseInt(this.value, 10) || 1;
    clearForm();
    load();
  });

  document.getElementById('addCohort').addEventListener('click', async function () {
    // 새 기수를 이름과 함께 만든다 (cohorts 테이블에 저장 → 기수 관리와 공유)
    var label = prompt('새 기수 이름을 입력하세요:', '');
    if (label == null) return;
    label = label.trim();
    if (!label) { alert('기수 이름을 입력하세요.'); return; }

    var nextId = maxCohort + 1;
    var res = await sb.from('cohorts').insert({ id: nextId, label: label });
    if (res.error) { alert('기수 추가 실패: ' + res.error.message); return; }

    cohort = nextId;
    await loadCohorts();
    clearForm();
    await load();
    alert('"' + label + '" 기수로 전환했습니다. 이 기수에 숙제를 등록하세요.\n' +
      '(수강생의 기수는 사용자 관리에서 지정합니다.)');
  });

  // 매뉴얼 챕터 목록으로 '관련 매뉴얼' 드롭다운 채우기
  async function loadManualChapters() {
    var res = await sb.from('manual_chapters').select('slug, title, sort').order('sort');
    manualChapters = res.data || [];
    var opts = '<option value="">연결 안 함</option>';
    manualChapters.forEach(function (m) {
      opts += '<option value="' + esc(m.slug) + '">' + esc(m.title) + '</option>';
    });
    var cur = els.manual.value;
    els.manual.innerHTML = opts;
    els.manual.value = cur;
  }

  els.saveBtn.addEventListener('click', async function () {
    var row = readForm();
    if (!row.title) { alert('숙제 제목을 입력하세요.'); return; }
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
    await loadCohorts();
    await loadManualChapters();
    await load();
  })();
})();
