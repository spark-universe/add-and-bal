/* =========================================================
   어드민 · 교재 관리
   - lessons 테이블 CRUD. 본문은 리치 텍스트(HTML)
   - 이미지는 공개 버킷 'lessons' 에 업로드 후 본문에 <img> 삽입
   - 과제 등록(admin/challenges) 에서 이 교재를 드롭다운으로 골라 연결
   ========================================================= */
(function () {
  var editingId = null;
  var lessons = [];
  var chCount = {};   // lesson_id → 연결된 과제 수

  var els = {
    category: document.getElementById('fCategory'),
    sort: document.getElementById('fSort'),
    title: document.getElementById('fTitle'),
    body: document.getElementById('fBody'),
    saveBtn: document.getElementById('saveBtn'),
    saved: document.getElementById('saved'),
    formTitle: document.getElementById('formTitle'),
    cancelEdit: document.getElementById('cancelEdit'),
    listBody: document.getElementById('lsBody'),
    count: document.getElementById('lsCount'),
    catList: document.getElementById('catList'),
    status: document.getElementById('rteStatus'),
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* ---------- 리치 텍스트 에디터 ---------- */
  // 툴바 버튼
  document.querySelectorAll('.rte__bar [data-cmd]').forEach(function (b) {
    b.addEventListener('click', function () {
      els.body.focus();
      document.execCommand(this.dataset.cmd, false, null);
    });
  });
  document.querySelectorAll('.rte__bar [data-block]').forEach(function (b) {
    b.addEventListener('click', function () {
      els.body.focus();
      document.execCommand('formatBlock', false, this.dataset.block);
    });
  });

  document.getElementById('rteLink').addEventListener('click', function () {
    els.body.focus();
    var url = prompt('연결할 링크(URL)를 입력하세요:', 'https://');
    if (url) document.execCommand('createLink', false, url);
  });

  // 이미지 업로드 → 공개 URL → 본문 삽입
  var fileInput = document.getElementById('rteFile');
  document.getElementById('rteImage').addEventListener('click', function () { fileInput.click(); });
  fileInput.addEventListener('change', async function () {
    var file = this.files && this.files[0];
    this.value = '';
    if (!file) return;
    els.status.textContent = '이미지 업로드 중...';

    var name = String(Date.now()) + '_' + file.name.replace(/[^\w.\-]/g, '_');
    var up = await sb.storage.from('lessons').upload(name, file, { upsert: true });
    if (up.error) { els.status.textContent = ''; alert('업로드 실패: ' + up.error.message); return; }

    var pub = sb.storage.from('lessons').getPublicUrl(name);
    var url = pub.data.publicUrl;
    els.body.focus();
    document.execCommand('insertHTML', false,
      '<img src="' + esc(url) + '" alt="" style="max-width:100%;border-radius:8px;margin:8px 0;">');
    els.status.textContent = '이미지 추가됨';
    setTimeout(function () { els.status.textContent = ''; }, 1500);
  });

  /* ---------- 폼 ---------- */
  function readForm() {
    return {
      category: els.category.value.trim() || null,
      title: els.title.value.trim(),
      body: els.body.innerHTML.trim() || null,
      sort: parseInt(els.sort.value, 10) || 0,
    };
  }
  function clearForm() {
    editingId = null;
    els.category.value = els.title.value = els.sort.value = '';
    els.body.innerHTML = '';
    els.formTitle.textContent = '교재 등록';
    els.saveBtn.textContent = '등록하기';
    els.cancelEdit.hidden = true;
  }
  function fillForm(l) {
    editingId = l.id;
    els.category.value = l.category || '';
    els.title.value = l.title || '';
    els.sort.value = l.sort != null ? l.sort : '';
    els.body.innerHTML = l.body || '';
    els.formTitle.textContent = '교재 수정 — ' + l.title;
    els.saveBtn.textContent = '수정 저장';
    els.cancelEdit.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function flash() {
    els.saved.hidden = false;
    setTimeout(function () { els.saved.hidden = true; }, 2000);
  }

  els.saveBtn.addEventListener('click', async function () {
    var row = readForm();
    if (!row.title) { alert('제목을 입력하세요.'); return; }

    els.saveBtn.disabled = true;
    row.updated_at = new Date().toISOString();
    var res = editingId
      ? await sb.from('lessons').update(row).eq('id', editingId)
      : await sb.from('lessons').insert(row);
    els.saveBtn.disabled = false;

    if (res.error) { alert('저장 실패: ' + res.error.message); return; }
    clearForm();
    flash();
    await load();
  });

  els.cancelEdit.addEventListener('click', clearForm);

  document.getElementById('previewBtn').addEventListener('click', function () {
    var w = window.open('', '_blank');
    w.document.write('<meta charset="utf-8"><title>미리보기</title>' +
      '<div style="max-width:760px;margin:40px auto;padding:0 20px;font-family:Pretendard,sans-serif;line-height:1.7;">' +
      '<h1 style="font-size:1.4rem;">' + esc(els.title.value || '(제목 없음)') + '</h1>' +
      '<hr>' + (els.body.innerHTML || '(내용 없음)') + '</div>');
  });

  /* ---------- 목록 ---------- */
  function render() {
    els.count.textContent = lessons.length ? '(' + lessons.length + '개)' : '';

    var cats = {};
    lessons.forEach(function (l) { if (l.category) cats[l.category] = true; });
    els.catList.innerHTML = Object.keys(cats).map(function (c) {
      return '<option value="' + esc(c) + '">';
    }).join('');

    if (!lessons.length) {
      els.listBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:40px;">' +
        '등록된 교재가 없습니다. 위 폼으로 교재를 등록하세요.</td></tr>';
      return;
    }
    els.listBody.innerHTML = lessons.map(function (l) {
      var n = chCount[l.id] || 0;
      return '<tr' + (l.active ? '' : ' style="opacity:0.45;"') + '>' +
        '<td>' + esc(l.category || '-') + '</td>' +
        '<td style="text-align:left;font-weight:600;max-width:340px;">' + esc(l.title) + '</td>' +
        '<td>' + (n ? n + '개' : '-') + '</td>' +
        '<td><button class="btn-sm" data-act="toggle" data-id="' + l.id + '">' +
          (l.active ? '표시중' : '숨김') + '</button></td>' +
        '<td>' +
          '<button class="btn-link" data-act="edit" data-id="' + l.id + '">수정</button> ' +
          '<button class="btn-link danger" data-act="del" data-id="' + l.id + '">삭제</button>' +
        '</td>' +
      '</tr>';
    }).join('');
  }

  els.listBody.addEventListener('click', async function (e) {
    var btn = e.target.closest('button[data-act]');
    if (!btn) return;
    var id = Number(btn.dataset.id);
    var l = lessons.find(function (x) { return x.id === id; });
    if (!l) return;

    if (btn.dataset.act === 'edit') { fillForm(l); return; }
    if (btn.dataset.act === 'toggle') {
      var r = await sb.from('lessons').update({ active: !l.active }).eq('id', id);
      if (r.error) { alert('변경 실패: ' + r.error.message); return; }
      await load();
      return;
    }
    if (btn.dataset.act === 'del') {
      var n = chCount[id] || 0;
      var msg = n
        ? '정말로 삭제하시겠습니까?\n\n"' + l.title + '"\n연결된 과제 ' + n + '개에서 교재가 해제됩니다.'
        : '정말로 삭제하시겠습니까?\n\n"' + l.title + '"';
      if (!confirm(msg)) return;
      var d = await sb.from('lessons').delete().eq('id', id);
      if (d.error) { alert('삭제 실패: ' + d.error.message); return; }
      if (editingId === id) clearForm();
      await load();
    }
  });

  async function load() {
    var res = await sb.from('lessons').select('*')
      .order('sort').order('created_at');
    if (res.error) { alert('교재를 불러오지 못했습니다: ' + res.error.message); return; }
    lessons = res.data || [];

    chCount = {};
    var ch = await sb.from('challenges').select('lesson_id');
    (ch.data || []).forEach(function (c) {
      if (c.lesson_id) chCount[c.lesson_id] = (chCount[c.lesson_id] || 0) + 1;
    });
    render();
  }

  (async function init() {
    var admin = await Auth.requireAdmin();
    if (!admin) return;
    await load();
  })();
})();
