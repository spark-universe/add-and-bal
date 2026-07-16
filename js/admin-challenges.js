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
    groups: document.getElementById('chGroups'),
    count: document.getElementById('chCount'),
    regOpen: document.getElementById('regCoOpen'),
    regSummary: document.getElementById('regCoSummary'),
    regModal: document.getElementById('regCoModal'),
    regClose: document.getElementById('regCoClose'),
    regSearch: document.getElementById('regCoSearch'),
    regAll: document.getElementById('regCoAll'),
    regNone: document.getElementById('regCoNone'),
    regCount: document.getElementById('regCoCount'),
    regList: document.getElementById('regCoList'),
    regApply: document.getElementById('regCoApply'),
  };

  function manualTitle(slug) {
    var m = manualChapters.find(function (x) { return x.slug === slug; });
    return m ? m.title : slug;
  }

  /* ----- '등록할 기수' 선택 (검색 팝업) ----- */
  var regSel = {};     // 등록 대상 기수 id 집합
  var tmpReg = {};     // 팝업 편집용
  var regLocked = false;   // 수정 모드면 잠금(기수 변경 불가)

  function cohortLabel(id) {
    var c = cohortList.find(function (x) { return x.id === id; });
    if (!c) return (id === 0 ? '미분류' : id + '기');
    return c.label + (c.enroll_date ? ' (' + c.enroll_date + ')' : '');
  }
  function getCheckedCohorts() { return Object.keys(regSel).map(Number); }
  function updateRegSummary() {
    var ids = getCheckedCohorts().sort(function (a, b) { return a - b; });
    els.regOpen.disabled = regLocked;
    if (regLocked) { els.regSummary.textContent = cohortLabel(ids[0]) + ' (수정 중, 변경 불가)'; return; }
    if (!ids.length) { els.regSummary.innerHTML = '<span style="color:var(--danger);">선택된 기수 없음</span>'; return; }
    var names = ids.slice(0, 3).map(cohortLabel).join(', ');
    els.regSummary.textContent = '선택 ' + ids.length + '개: ' + names + (ids.length > 3 ? ' 외 ' + (ids.length - 3) + '개' : '');
  }
  function setRegSelection(ids, locked) {
    regSel = {}; ids.forEach(function (i) { regSel[i] = true; });
    regLocked = !!locked;
    updateRegSummary();
  }

  function renderRegList() {
    var q = (els.regSearch.value || '').trim().toLowerCase();
    var list = cohortList.filter(function (c) {
      if (!q) return true;
      return (c.label || '').toLowerCase().indexOf(q) !== -1 ||
             (c.enroll_date || '').toLowerCase().indexOf(q) !== -1;
    });
    els.regList.innerHTML = list.length ? list.map(function (c) {
      return '<label style="display:flex;align-items:center;gap:9px;padding:9px 12px;border-bottom:1px solid #f0f2f6;cursor:pointer;font-size:0.9rem;">' +
        '<input type="checkbox" class="reg-cb" value="' + c.id + '"' + (tmpReg[c.id] ? ' checked' : '') + '>' +
        '<b>' + esc(c.label) + '</b>' + (c.enroll_date ? '<span style="color:var(--muted);">· ' + esc(c.enroll_date) + '</span>' : '') +
      '</label>';
    }).join('') : '<div style="padding:24px;text-align:center;color:var(--muted);font-size:0.85rem;">검색 결과가 없습니다.</div>';
    els.regCount.textContent = '선택 ' + Object.keys(tmpReg).length + '개 기수';
  }
  els.regOpen.addEventListener('click', function () {
    if (regLocked) return;
    tmpReg = {}; Object.keys(regSel).forEach(function (k) { tmpReg[k] = true; });
    els.regSearch.value = '';
    renderRegList();
    els.regModal.classList.add('is-open');
    els.regSearch.focus();
  });
  function closeRegModal() { els.regModal.classList.remove('is-open'); }
  els.regClose.addEventListener('click', closeRegModal);
  els.regModal.addEventListener('click', function (e) { if (e.target === els.regModal) closeRegModal(); });
  els.regSearch.addEventListener('input', renderRegList);
  els.regList.addEventListener('change', function (e) {
    var cb = e.target.closest('.reg-cb'); if (!cb) return;
    var id = Number(cb.value);
    if (cb.checked) tmpReg[id] = true; else delete tmpReg[id];
    els.regCount.textContent = '선택 ' + Object.keys(tmpReg).length + '개 기수';
  });
  els.regAll.addEventListener('click', function () {
    els.regList.querySelectorAll('.reg-cb').forEach(function (cb) { tmpReg[Number(cb.value)] = true; });
    renderRegList();
  });
  els.regNone.addEventListener('click', function () {
    els.regList.querySelectorAll('.reg-cb').forEach(function (cb) { delete tmpReg[Number(cb.value)]; });
    renderRegList();
  });
  els.regApply.addEventListener('click', function () {
    regSel = {}; Object.keys(tmpReg).forEach(function (k) { regSel[Number(k)] = true; });
    updateRegSummary();
    closeRegModal();
  });

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
      open_at: localToISO(els.open.value),
      due_at: localToISO(els.due.value),
    };
  }
  function clearForm() {
    editingId = null;
    els.title.value = els.desc.value = els.open.value = els.due.value = '';
    els.manual.value = '';
    setRegSelection([cohort], false);    // 기본: 지금 보는 기수
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
    setRegSelection([c.cohort], true);   // 수정 시엔 그 기수만·변경 불가
    els.formTitle.textContent = '숙제 수정 — ' + c.title;
    els.saveBtn.textContent = '수정 저장';
    els.cancelEdit.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function flash() {
    els.saved.hidden = false;
    setTimeout(function () { els.saved.hidden = true; }, 2000);
  }

  function rowHtml(c) {
    var n = subCount[c.id] || 0;
    return '<tr' + (c.active ? '' : ' style="opacity:0.45;"') + '>' +
      '<td style="text-align:left;font-weight:600;">' + esc(c.title) + '</td>' +
      '<td>' + fmtDate(c.due_at) + '</td>' +
      '<td>' + (n ? '<a href="challenge-review.html?id=' + c.id + '" style="color:var(--primary);">' + n + '건</a>' : '0건') + '</td>' +
      '<td><button class="btn-sm" data-act="toggle" data-id="' + c.id + '">' +
        (c.active ? '표시중' : '숨김') + '</button></td>' +
      '<td>' +
        '<button class="btn-link" data-act="edit" data-id="' + c.id + '">수정</button> ' +
        '<button class="btn-link danger" data-act="del" data-id="' + c.id + '">삭제</button>' +
      '</td>' +
    '</tr>';
  }
  function groupHtml(title, slug, list) {
    var rows = list.length ? list.map(rowHtml).join('') :
      '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:14px;">아직 숙제가 없습니다.</td></tr>';
    var headBtn = slug !== null
      ? '<button class="btn-sm" data-add="' + esc(slug) + '">＋ 이 단원에 숙제 추가</button>'
      : (list.length ? '<button class="btn-link danger" data-delgroup="1">이 목록 전체 삭제</button>' : '');
    return '<div class="panel" style="margin-bottom:14px;">' +
      '<div class="panel__head">' +
        '<span>📘 ' + esc(title) + ' <span style="color:var(--muted);font-weight:600;">(' + list.length + '개)</span></span>' +
        headBtn +
      '</div>' +
      '<table><thead><tr><th style="text-align:left;">제목</th><th style="width:120px;">마감일</th>' +
        '<th style="width:80px;">제출</th><th style="width:90px;">표시</th><th style="width:140px;">관리</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table>' +
    '</div>';
  }

  function render() {
    els.count.textContent = challenges.length ? '(' + challenges.length + '개)' : '';

    if (!manualChapters.length) {
      els.groups.innerHTML = '<div class="panel"><div style="padding:30px;text-align:center;color:var(--muted);">' +
        '매뉴얼 단원이 없습니다. setup.sql 을 실행하면 단원이 등록됩니다.</div></div>';
      return;
    }
    // 숙제를 단원(manual_slug)별로 묶는다
    var bySlug = {};
    challenges.forEach(function (c) {
      var k = c.manual_slug || '__none__';
      (bySlug[k] = bySlug[k] || []).push(c);
    });

    var html = manualChapters.map(function (m) {
      return groupHtml(m.title, m.slug, bySlug[m.slug] || []);
    }).join('');

    var none = bySlug['__none__'] || [];
    if (none.length) html += groupHtml('(단원 미지정)', null, none);

    els.groups.innerHTML = html;
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

    var res;
    if (editingId) {
      // 수정: 그 숙제만 (기수·공개상태 유지)
      els.saveBtn.disabled = true;
      res = await sb.from('challenges').update(row).eq('id', editingId);
    } else {
      // 등록: 선택한 기수마다 생성 (비공개)
      var targets = getCheckedCohorts();
      if (!targets.length) { alert('등록할 기수를 하나 이상 선택하세요.'); return; }
      var rows = targets.map(function (cid) {
        return Object.assign({ active: false, cohort: cid }, row);
      });
      els.saveBtn.disabled = true;
      res = await sb.from('challenges').insert(rows);
    }
    els.saveBtn.disabled = false;

    if (res.error) { alert('저장 실패: ' + res.error.message); return; }
    clearForm();
    flash();
    await load();
  });

  els.cancelEdit.addEventListener('click', clearForm);

  els.groups.addEventListener('click', async function (e) {
    // "이 단원에 숙제 추가" → 폼에 그 단원을 미리 선택하고 위로
    var addBtn = e.target.closest('button[data-add]');
    if (addBtn) {
      clearForm();
      els.manual.value = addBtn.dataset.add;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      els.title.focus();
      return;
    }

    // (단원 미지정) 목록 전체 삭제
    var delGroup = e.target.closest('button[data-delgroup]');
    if (delGroup) {
      var unassigned = challenges.filter(function (c) { return !c.manual_slug; });
      if (!unassigned.length) return;
      var subs = unassigned.reduce(function (a, c) { return a + (subCount[c.id] || 0); }, 0);
      var msg = '단원 미지정 숙제 ' + unassigned.length + '개를 모두 삭제할까요?' +
        (subs ? '\n제출된 ' + subs + '건도 함께 삭제됩니다.' : '');
      if (!confirm(msg)) return;
      var dg = await sb.from('challenges').delete().eq('cohort', cohort).is('manual_slug', null);
      if (dg.error) { alert('삭제 실패: ' + dg.error.message); return; }
      clearForm();
      await load();
      return;
    }

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
    clearForm();          // 기수 체크박스 초기화
    await load();
  })();
})();
