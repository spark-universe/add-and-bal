/* =========================================================
   어드민 · 매뉴얼 영상 (챕터별 영상 링크)
   - manual_chapters.videos (jsonb 배열 [{title, url}]) 를 읽고 쓴다. 기수 구분 없음(모든 기수 공통)
   - 링크 판별·렌더 규칙은 js/manual-video.js — 수강생 화면(manual.html)과 같은 코드를 쓴다
   - 본문(HTML)은 여기서 건드리지 않는다. 영상은 본문의 <div data-video-slot></div> 자리(없으면 맨 위)에 그려진다
   ========================================================= */
(function () {
  var chapters = [];
  var editing = null;   // 편집 중인 챕터 slug

  var els = {
    body: document.getElementById('mvBody'),
    count: document.getElementById('mvCount'),
    saved: document.getElementById('saved'),
    modal: document.getElementById('vModal'),
    title: document.getElementById('vTitle'),
    list: document.getElementById('vList'),
    add: document.getElementById('vAdd'),
    close: document.getElementById('vClose'),
    cancel: document.getElementById('vCancel'),
    save: document.getElementById('vSave'),
  };

  // esc 는 js/util.js 의 공통 함수 사용
  function kindTag(p) {
    var cls = p.kind === 'bad' ? 'tag--no' : (p.kind === 'link' ? 'tag--wait' : 'tag--ok');
    return '<span class="tag ' + cls + '">' + esc(p.label) + '</span>';
  }
  // 어드민 화면은 admin/ 아래에 있어 사이트 파일 경로는 한 단계 올라가서 연다
  function openHref(p) { return p.kind === 'file' ? '../' + p.href : p.href; }
  function flash() { els.saved.hidden = false; setTimeout(function () { els.saved.hidden = true; }, 2000); }

  function render() {
    els.count.textContent = chapters.length ? '(' + chapters.length + '개)' : '';
    els.body.innerHTML = chapters.map(function (c, i) {
      var vids = Array.isArray(c.videos) ? c.videos : [];
      var cell = vids.length ? '<div class="mv-list">' + vids.map(function (v) {
        var p = ManualVideo.parse(v && v.url);
        if (!p) return '';
        return '<div class="mv-item">' + kindTag(p) +
          (v.title ? '<b>' + esc(v.title) + '</b>' : '') +
          '<span class="mv-url" title="' + esc(v.url) + '">' + esc(v.url) + '</span>' +
          (p.kind !== 'bad' ? '<a href="' + esc(openHref(p)) + '" target="_blank" rel="noopener" style="font-size:0.78rem;white-space:nowrap;">열기 ↗</a>' : '') +
        '</div>';
      }).join('') + '</div>' : '<span style="color:var(--muted);font-size:0.82rem;">없음</span>';
      return '<tr data-slug="' + esc(c.slug) + '">' +
        '<td>' + (i + 1) + '</td>' +
        '<td style="text-align:left;font-weight:600;">' + esc(c.title) +
          ' <span style="color:var(--muted);font-weight:400;font-size:0.8rem;">#' + esc(c.slug) + '</span></td>' +
        '<td style="text-align:left;">' + cell + '</td>' +
        '<td><button class="btn-sm mv-edit-btn" type="button">' + (vids.length ? '✎ 편집' : '＋ 추가') + '</button></td>' +
      '</tr>';
    }).join('');
  }

  /* ----- 편집 팝업 ----- */
  function rowHtml(v) {
    return '<div class="mv-edit">' +
      '<input class="mv-title" placeholder="제목 (선택)" value="' + esc(v.title || '') + '">' +
      '<input class="mv-url" placeholder="영상 링크 붙여넣기 — 드라이브 / 유튜브 / manual/videos/파일명.mp4" value="' + esc(v.url || '') + '">' +
      '<a class="btn-sm mv-open" target="_blank" rel="noopener" href="#">열기 ↗</a>' +
      '<button class="btn-sm is-danger mv-del" type="button">삭제</button>' +
      '<div class="mv-kind"></div>' +
    '</div>';
  }
  // 링크를 입력할 때마다 어떤 방식으로 보일지(판별 결과)와 주의점을 바로 보여준다
  function refreshRow(row) {
    var p = ManualVideo.parse(row.querySelector('.mv-url').value);
    var kind = row.querySelector('.mv-kind'), open = row.querySelector('.mv-open');
    if (!p) { kind.innerHTML = ''; open.style.visibility = 'hidden'; open.href = '#'; return; }
    var extra = '';
    if (p.kind === 'drive') extra = ' <span class="mv-warn">드라이브 공유가 "링크가 있는 모든 사용자"인지 확인하세요</span>';
    if (p.kind === 'link') extra = ' <span class="mv-warn">사이트 안에서 재생되지 않고 새 창으로 열립니다</span>';
    if (p.kind === 'bad') extra = ' <span class="mv-warn">http(s) 링크나 사이트 파일 경로만 넣을 수 있어요</span>';
    kind.innerHTML = kindTag(p) + extra;
    open.style.visibility = p.kind === 'bad' ? 'hidden' : 'visible';
    open.href = p.kind === 'bad' ? '#' : openHref(p);
  }
  function openModal(slug) {
    var c = chapters.find(function (x) { return x.slug === slug; });
    if (!c) return;
    editing = slug;
    els.title.textContent = '영상 링크 — ' + c.title;
    var vids = (Array.isArray(c.videos) && c.videos.length) ? c.videos : [{ title: '', url: '' }];
    els.list.innerHTML = vids.map(rowHtml).join('');
    els.list.querySelectorAll('.mv-edit').forEach(refreshRow);
    els.modal.classList.add('is-open');
    var first = els.list.querySelector('.mv-url');
    if (first && !first.value) first.focus();
  }
  function closeModal() { els.modal.classList.remove('is-open'); editing = null; }

  els.list.addEventListener('input', function (e) {
    var row = e.target.closest('.mv-edit');
    if (row && e.target.classList.contains('mv-url')) refreshRow(row);
  });
  els.list.addEventListener('click', function (e) {
    var del = e.target.closest('.mv-del');
    if (!del) return;
    var row = del.closest('.mv-edit');
    if (row) row.remove();
  });
  els.add.addEventListener('click', function () {
    els.list.insertAdjacentHTML('beforeend', rowHtml({ title: '', url: '' }));
    var rows = els.list.querySelectorAll('.mv-edit'), last = rows[rows.length - 1];
    refreshRow(last);
    last.querySelector('.mv-url').focus();
  });
  els.close.addEventListener('click', closeModal);
  els.cancel.addEventListener('click', closeModal);
  els.modal.addEventListener('click', function (e) { if (e.target === els.modal) closeModal(); });
  els.body.addEventListener('click', function (e) {
    var b = e.target.closest('.mv-edit-btn');
    if (!b) return;
    var tr = b.closest('tr');
    if (tr) openModal(tr.dataset.slug);
  });

  els.save.addEventListener('click', async function () {
    if (!editing) return;
    var out = [], bad = null;
    els.list.querySelectorAll('.mv-edit').forEach(function (row) {
      var url = row.querySelector('.mv-url').value.trim();
      var title = row.querySelector('.mv-title').value.trim();
      if (!url) return;                                   // 링크가 빈 줄은 저장하지 않음
      var p = ManualVideo.parse(url);
      if (!p || p.kind === 'bad') { bad = url; return; }
      out.push({ title: title, url: url });
    });
    if (bad) { alert('사용할 수 없는 링크입니다:\n' + bad); return; }
    els.save.disabled = true; els.save.textContent = '저장 중...';
    var res = await sb.from('manual_chapters')
      .update({ videos: out, updated_at: new Date().toISOString() })
      .eq('slug', editing).select('slug');
    els.save.disabled = false; els.save.textContent = '저장';
    if (res.error) {
      alert('저장 실패: ' + res.error.message + (/videos/.test(res.error.message) ? '\n(supabase/manual-videos.sql 을 실행했는지 확인하세요)' : ''));
      return;
    }
    if (!res.data || !res.data.length) { alert('저장이 반영되지 않았습니다. (어드민 권한/세션 확인)'); return; }
    closeModal();
    await load();
    flash();
  });

  async function load() {
    var res = await sb.from('manual_chapters').select('slug, title, sort, videos').order('sort');
    if (res.error) {
      els.body.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--danger);padding:40px;">' +
        '불러오기 실패: ' + esc(res.error.message) + '<br>supabase/manual-videos.sql 을 실행했는지 확인하세요.</td></tr>';
      return;
    }
    chapters = res.data || [];
    render();
  }

  (async function init() {
    var admin = await Auth.requireAdmin();
    if (!admin) return;
    await load();
  })();
})();
