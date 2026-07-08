/* =========================================================
   기본 설정 연습하기 — 자료 제출 (Supabase Storage + submissions 테이블)
   상태: (없음) → draft(제출 대기) → confirmed(제출 확정)
   - 파일 선택 → Storage 업로드 + submissions 행 upsert(draft)
   - [제출 확정] → status=confirmed (어드민 자료 검수에 노출, 이후 잠금)
   - [파일 수정] → 새 파일로 교체(다시 draft)
   - [제출 취소] → Storage 파일 삭제 + 행 삭제
   - [제출한 자료 보기] → 서명 URL 로 새 탭에서 열기
   ========================================================= */
(function () {
  var BUCKET = 'submissions';
  var user = null;
  var subs = {};   // item(key) -> submissions row

  function fmtDate(iso) { return iso ? iso.slice(0, 10) : '-'; }

  async function loadSubs() {
    var res = await sb.from('submissions').select('*');
    subs = {};
    if (!res.error && res.data) {
      res.data.forEach(function (row) { subs[row.item] = row; });
    }
    renderAll();
  }

  function renderAll() {
    var pass = 0;
    document.querySelectorAll('.submit-card').forEach(function (card) {
      if (renderCard(card, card.dataset.key)) pass++;
    });
    // 통과 개수 요약
    var pc = document.getElementById('passCount');
    if (pc) pc.textContent = pass;
    var hint = document.getElementById('passHint');
    if (hint) hint.textContent = pass === 4 ? '· 모든 항목을 통과했습니다! 🎉' : '';
  }

  // 반환값: 통과(pass)면 true
  function renderCard(card, key) {
    var info = subs[key];
    var nameEl = card.querySelector('.name');
    var metaEl = card.querySelector('.meta');
    var editBtn = card.querySelector('.act-edit');
    card.classList.remove('has-file', 'is-draft', 'is-locked', 'is-pass', 'is-fail');
    if (!info) return false;

    card.classList.add('has-file');
    nameEl.textContent = '📎 ' + info.file_name;

    if (info.status === 'confirmed') {
      if (info.review_status === 'pass') {
        card.classList.add('is-pass', 'is-locked');
        metaEl.innerHTML = '<b style="color:var(--ok);">통과 ✅</b>' +
          '<span class="submit-locked">🔒 검수를 통과했습니다.</span>';
        return true;
      } else if (info.review_status === 'fail') {
        card.classList.add('is-fail');
        editBtn.textContent = '재제출';
        metaEl.innerHTML = '<b style="color:var(--danger);">미통과 ❌</b>' +
          '<span class="submit-reason">사유: ' + (info.review_reason || '(사유 없음)') + '</span>' +
          '<span class="submit-locked">파일을 수정해 다시 제출하세요.</span>';
      } else {
        // 확정됐지만 아직 검수 전
        card.classList.add('is-locked');
        metaEl.innerHTML = fmtDate(info.confirmed_at) + ' 제출 확정 ✅' +
          '<span class="submit-locked">🔒 검수 대기 중입니다.</span>';
      }
    } else {
      card.classList.add('is-draft');
      editBtn.textContent = '파일 수정';
      metaEl.textContent = fmtDate(info.created_at) + ' 업로드 · 제출 대기 ⏳';
    }
    return false;
  }

  // 파일 업로드(신규/교체) → draft
  async function uploadFile(key, file) {
    // 기존 파일이 있으면 Storage 에서 제거(고아 파일 방지)
    var prev = subs[key];
    if (prev && prev.file_path) {
      await sb.storage.from(BUCKET).remove([prev.file_path]);
    }
    var path = user.id + '/' + key + '/' + Date.now() + '_' + file.name;
    var up = await sb.storage.from(BUCKET).upload(path, file, { upsert: true });
    if (up.error) { alert('업로드 실패: ' + up.error.message); return; }

    var row = {
      user_id: user.id, item: key,
      file_path: path, file_name: file.name,
      status: 'draft', confirmed_at: null,
      review_status: 'pending', review_reason: null, reviewed_at: null   // 재제출 시 이전 검수결과 초기화
    };
    var res = await sb.from('submissions').upsert(row, { onConflict: 'user_id,item' }).select();
    if (res.error) { alert('저장 실패: ' + res.error.message); return; }
    await loadSubs();
  }

  function wireCard(card) {
    var key = card.dataset.key;
    var input = card.querySelector('.submit-input');
    var uploadBtn = card.querySelector('.submit-btn');
    var viewBtn = card.querySelector('.act-view');
    var confirmBtn = card.querySelector('.act-confirm');
    var editBtn = card.querySelector('.act-edit');
    var cancelBtn = card.querySelector('.act-cancel');

    uploadBtn.addEventListener('click', function () { input.click(); });
    editBtn.addEventListener('click', function () { input.click(); });

    input.addEventListener('change', async function () {
      var file = input.files[0];
      if (!file) return;
      input.value = '';
      await uploadFile(key, file);
    });

    // 제출한 자료 보기 (private 버킷 → 서명 URL)
    viewBtn.addEventListener('click', async function () {
      var info = subs[key];
      if (!info) return;
      var res = await sb.storage.from(BUCKET).createSignedUrl(info.file_path, 60);
      if (res.error) { alert('파일 열기 실패: ' + res.error.message); return; }
      window.open(res.data.signedUrl, '_blank');
    });

    // 제출 확정
    confirmBtn.addEventListener('click', async function () {
      var info = subs[key];
      if (!info) return;
      if (!confirm('제출을 확정하면 파일을 수정하거나 취소할 수 없습니다.\n정말로 제출을 확정하시겠습니까?')) return;
      var res = await sb.from('submissions')
        .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
        .eq('id', info.id).select();
      if (res.error) { alert('확정 실패: ' + res.error.message); return; }
      await loadSubs();
    });

    // 제출 취소(삭제)
    cancelBtn.addEventListener('click', async function () {
      var info = subs[key];
      if (!info) return;
      if (!confirm('제출을 취소하고 파일을 삭제할까요?')) return;
      if (info.file_path) await sb.storage.from(BUCKET).remove([info.file_path]);
      var res = await sb.from('submissions').delete().eq('id', info.id);
      if (res.error) { alert('삭제 실패: ' + res.error.message); return; }
      await loadSubs();
    });
  }

  (async function init() {
    user = await Auth.require();
    if (!user) return;
    document.querySelectorAll('.submit-card').forEach(wireCard);
    await loadSubs();
  })();
})();
