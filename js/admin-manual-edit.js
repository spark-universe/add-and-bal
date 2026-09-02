/* =========================================================
   매뉴얼 편집 (어드민)
   - manual_chapters(slug, num, title, part, sort, soon, body) 를 CRUD
   - 저장하면 수강생 매뉴얼(manual.html)이 DB에서 읽어 바로 반영
   - 이미지 업로드는 'materials' 공개 버킷 재사용
   - '기존 매뉴얼 불러오기' = js/manual-content.js(MANUAL_SEED)를 최초 1회 이관
   ========================================================= */
(function () {
  var chapters = [];
  var editingSlug = null;   // 수정 중이면 원래 slug, 신규면 null

  var $ = function (id) { return document.getElementById(id); };

  async function load() {
    var res = await sb.from('manual_chapters')
      .select('slug,num,title,part,sort,soon,body').order('sort', { ascending: true });
    chapters = (res.data) || [];
    renderList();
    renderPartList();
  }

  function renderList() {
    var body = $('listBody');
    if (!chapters.length) {
      body.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:40px;">' +
        '아직 챕터가 없습니다. <b>기존 매뉴얼 불러오기</b>로 가져오거나 <b>＋ 챕터 추가</b>로 만드세요.</td></tr>';
    } else {
      body.innerHTML = chapters.map(function (c) {
        return '<tr>' +
          '<td>' + (c.sort != null ? c.sort : '') + '</td>' +
          '<td>' + esc(c.num || '') + '</td>' +
          '<td style="text-align:left;">' + esc(c.title || '') + '</td>' +
          '<td>' + esc(c.part || '') + '</td>' +
          '<td>' + (c.soon ? '✓' : '') + '</td>' +
          '<td style="white-space:nowrap;">' +
            '<button class="btn-sm" data-edit="' + esc(c.slug) + '">편집</button> ' +
            '<button class="btn-sm is-danger" data-del="' + esc(c.slug) + '">삭제</button></td>' +
        '</tr>';
      }).join('');
    }
    $('chCount').textContent = chapters.length ? chapters.length + '개' : '';
  }

  function renderPartList() {
    var parts = [];
    chapters.forEach(function (c) { if (c.part && parts.indexOf(c.part) === -1) parts.push(c.part); });
    $('partList').innerHTML = parts.map(function (p) { return '<option value="' + esc(p) + '">'; }).join('');
  }

  /* ---------- 편집 패널 ---------- */
  function openEditor(c) {
    editingSlug = c ? c.slug : null;
    $('editTitle').textContent = c ? '챕터 편집 — ' + (c.title || '') : '새 챕터';
    $('fPart').value = c ? (c.part || '') : '';
    $('fNum').value = c ? (c.num || '') : '';
    $('fTitle').value = c ? (c.title || '') : '';
    $('fSlug').value = c ? (c.slug || '') : '';
    $('fSlug').readOnly = !!c;                    // 기존 챕터는 slug 고정 (링크 안정)
    $('fSort').value = c ? (c.sort != null ? c.sort : 0) : nextSort();
    $('fSoon').checked = c ? !!c.soon : false;
    $('fBody').value = c ? (c.body || '') : '';
    $('saveErr').textContent = '';
    $('saved').hidden = true;
    $('previewFrame').hidden = true;
    $('editPanel').hidden = false;
    $('editPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function nextSort() {
    var max = 0; chapters.forEach(function (c) { if ((c.sort || 0) > max) max = c.sort || 0; });
    return max + 1;
  }
  function closeEditor() { $('editPanel').hidden = true; editingSlug = null; }

  function slugify(s) {
    var v = String(s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return v || ('ch-' + Date.now());
  }

  async function saveChapter() {
    var title = $('fTitle').value.trim();
    if (!title) { $('saveErr').textContent = '제목을 입력하세요.'; return; }
    var slug = $('fSlug').value.trim();
    if (!editingSlug && !slug) slug = slugify(title);      // 신규인데 slug 비면 자동 생성
    if (!slug) { $('saveErr').textContent = 'slug를 입력하세요.'; return; }
    // 신규일 때 slug 중복 방지
    if (!editingSlug && chapters.some(function (c) { return c.slug === slug; })) {
      $('saveErr').textContent = '이미 있는 slug입니다. 다른 값을 쓰세요.'; return;
    }

    var row = {
      slug: slug,
      part: $('fPart').value.trim() || null,
      num: $('fNum').value.trim() || null,
      title: title,
      sort: parseInt($('fSort').value, 10) || 0,
      soon: $('fSoon').checked,
      body: $('fBody').value
    };
    $('saveBtn').disabled = true;
    var res = await sb.from('manual_chapters').upsert(row, { onConflict: 'slug' });
    $('saveBtn').disabled = false;
    if (res.error) { $('saveErr').textContent = '저장 실패: ' + res.error.message; return; }
    $('saved').hidden = false;
    setTimeout(function () { $('saved').hidden = true; }, 2000);
    await load();
    // 편집 계속할 수 있게 패널은 유지하되 편집 대상 갱신
    editingSlug = slug;
    $('fSlug').readOnly = true;
    $('editTitle').textContent = '챕터 편집 — ' + title;
  }

  async function deleteChapter(slug) {
    var c = chapters.find(function (x) { return x.slug === slug; });
    if (!c) return;
    if (!confirm('정말 삭제하시겠습니까?\n\n챕터 "' + (c.title || slug) + '"\n(되돌릴 수 없습니다)')) return;
    var res = await sb.from('manual_chapters').delete().eq('slug', slug);
    if (res.error) { alert('삭제 실패: ' + res.error.message); return; }
    if (editingSlug === slug) closeEditor();
    await load();
  }

  /* ---------- 이미지 업로드 → 본문에 삽입 ---------- */
  async function uploadImage(file) {
    $('imgMsg').textContent = '업로드 중...';
    var name = 'manual/' + Date.now() + '_' + file.name.replace(/[^\w.\-]/g, '_');
    var up = await sb.storage.from('materials').upload(name, file, { upsert: false });
    if (up.error) { $('imgMsg').textContent = '업로드 실패: ' + up.error.message; return; }
    var url = sb.storage.from('materials').getPublicUrl(name).data.publicUrl;
    insertAtCursor($('fBody'), '<figure class="shot"><img loading="lazy" src="' + url + '" alt=""></figure>\n');
    $('imgMsg').textContent = '삽입됨';
    setTimeout(function () { $('imgMsg').textContent = ''; }, 2000);
  }
  function insertAtCursor(ta, text) {
    var s = ta.selectionStart, e = ta.selectionEnd;
    ta.value = ta.value.slice(0, s) + text + ta.value.slice(e);
    ta.selectionStart = ta.selectionEnd = s + text.length;
    ta.focus();
  }

  /* ---------- 미리보기 (manual.css 로 실제처럼) ---------- */
  function preview() {
    var f = $('previewFrame');
    if (!f.hidden) { f.hidden = true; return; }
    var num = esc($('fNum').value.trim()), title = esc($('fTitle').value.trim());
    var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><base href="../">' +
      '<link rel="stylesheet" href="css/manual.css"></head>' +
      '<body class="manual-page"><div class="manual-doc ready"><div class="mn-layout"><main class="main">' +
      '<section class="doc-section">' +
      '<div class="sec-head"><span class="sec-num">' + num + '</span><h2 class="sec-title">' + title + '</h2></div>' +
      $('fBody').value +
      '</section></main></div></div></body></html>';
    f.setAttribute('sandbox', 'allow-same-origin');  // 미리보기 안에서 스크립트 실행 차단
    f.srcdoc = html;
    f.hidden = false;
    f.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ---------- 기존 매뉴얼(코드) → DB 이관 ---------- */
  function loadSeed(cb) {
    if (window.MANUAL_SEED) return cb();
    var s = document.createElement('script');
    s.src = '../js/manual-content.js';
    s.onload = function () { cb(); };
    s.onerror = function () { alert('시드 파일(js/manual-content.js)을 불러오지 못했습니다.'); };
    document.head.appendChild(s);
  }
  function migrate() {
    loadSeed(async function () {
      var seed = window.MANUAL_SEED || [];
      if (!seed.length) { alert('가져올 데이터가 없습니다.'); return; }
      if (!confirm('기존 매뉴얼 ' + seed.length + '개 챕터를 DB로 가져옵니다.\n같은 slug가 있으면 덮어씁니다. 계속할까요?')) return;
      var rows = seed.map(function (c) {
        return { slug: c.slug, part: c.part || null, num: c.num || null, title: c.title || '',
                 sort: c.sort || 0, soon: !!c.soon, body: c.body || '' };
      });
      $('migrateBtn').disabled = true;
      $('migrateBtn').textContent = '가져오는 중...';
      var res = await sb.from('manual_chapters').upsert(rows, { onConflict: 'slug' });
      $('migrateBtn').disabled = false;
      $('migrateBtn').textContent = '기존 매뉴얼 불러오기';
      if (res.error) { alert('가져오기 실패: ' + res.error.message); return; }
      alert('완료! ' + rows.length + '개 챕터를 가져왔습니다.');
      await load();
    });
  }

  /* ---------- 이벤트 ---------- */
  $('addBtn').addEventListener('click', function () { openEditor(null); });
  $('closeEdit').addEventListener('click', closeEditor);
  $('saveBtn').addEventListener('click', saveChapter);
  $('migrateBtn').addEventListener('click', migrate);
  $('previewBtn').addEventListener('click', preview);
  $('imgBtn').addEventListener('click', function () { $('fImg').click(); });
  $('fImg').addEventListener('change', function () { if (this.files[0]) uploadImage(this.files[0]); this.value = ''; });
  $('listBody').addEventListener('click', function (e) {
    var ed = e.target.closest('[data-edit]');
    if (ed) { var c = chapters.find(function (x) { return x.slug === ed.dataset.edit; }); if (c) openEditor(c); return; }
    var dl = e.target.closest('[data-del]');
    if (dl) deleteChapter(dl.dataset.del);
  });

  (async function init() {
    var user = await Auth.requireAdmin();   // 로그인만이 아니라 관리자만 (fail-closed)
    if (!user) return;
    await load();
  })();
})();
