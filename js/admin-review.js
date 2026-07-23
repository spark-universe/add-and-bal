/* =========================================================
   어드민 · 자료 검수 (매트릭스: 행=수강생, 열=항목)
   - 확정된 자료를 항목별로 통과/미통과 판정
   - 미통과 시 사유 입력
   ========================================================= */
(function () {
  var BUCKET = 'submissions';
  var ITEMS = ['shop', 'category', 'order', 'amazon'];

  var body = document.getElementById('reviewBody');
  var countEl = document.getElementById('reviewCount');

  var subsByUser = {};   // uid -> { item -> row }
  var nameById = {};

  // esc 는 js/util.js 의 공통 함수 사용

  function cellHtml(uid, item) {
    var row = (subsByUser[uid] || {})[item];
    if (!row) return '<span style="color:#aab;font-size:0.82rem;">미제출</span>';
    if (row.status !== 'confirmed') return '<span class="tag tag--wait">제출 대기</span>';

    var actions;
    if (row.review_status === 'pass') {
      // 통과: 판정 버튼 숨기고 결과 + 정정 버튼
      actions = '<span class="tag tag--ok">통과 ✅</span>' +
        '<button class="btn-sm" data-reset="' + row.id + '">정정</button>';
    } else if (row.review_status === 'fail') {
      // 미통과: 사유 표시 + 판정 버튼(직접 변경 가능)
      actions = '<span class="tag tag--no" title="' + esc(row.review_reason) + '">미통과</span>' +
        (row.review_reason ? '<div style="font-size:0.72rem;color:var(--danger);max-width:150px;">사유: ' + esc(row.review_reason) + '</div>' : '') +
        '<div style="display:flex;gap:4px;">' +
          '<button class="btn-sm is-primary" data-pass="' + row.id + '">통과</button>' +
          '<button class="btn-sm" data-fail="' + row.id + '" style="color:var(--danger);">미통과</button>' +
        '</div>';
    } else {
      // 검수 전: 통과/미통과 버튼
      actions = '<div style="display:flex;gap:4px;">' +
          '<button class="btn-sm is-primary" data-pass="' + row.id + '">통과</button>' +
          '<button class="btn-sm" data-fail="' + row.id + '" style="color:var(--danger);">미통과</button>' +
        '</div>';
    }

    return '' +
      '<div style="display:flex;flex-direction:column;gap:6px;align-items:center;">' +
        '<span style="color:var(--ok);font-weight:700;font-size:0.78rem;">제출 완료</span>' +
        actions +
        '<button class="btn-sm" data-path="' + esc(row.file_path) + '">자료 보기</button>' +
      '</div>';
  }

  function render(uids) {
    if (!uids.length) {
      body.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:40px;">제출한 수강생이 없습니다.</td></tr>';
      return;
    }
    body.innerHTML = uids.map(function (uid) {
      var cells = ITEMS.map(function (item) {
        return '<td>' + cellHtml(uid, item) + '</td>';
      }).join('');
      return '<tr><td><b>' + esc(nameById[uid] || '-') + '</b></td>' + cells + '</tr>';
    }).join('');
  }

  async function load() {
    var su = await sb.from('submissions').select('*');
    if (su.error) {
      body.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--danger);padding:40px;">조회 실패: ' + esc(su.error.message) + '</td></tr>';
      return;
    }
    var subs = su.data || [];

    subsByUser = {};
    subs.forEach(function (r) {
      (subsByUser[r.user_id] = subsByUser[r.user_id] || {})[r.item] = r;
    });

    // 검수 대기 = 확정됐지만 아직 판정 안된 건
    var waiting = subs.filter(function (r) {
      return r.status === 'confirmed' && r.review_status !== 'pass' && r.review_status !== 'fail';
    }).length;
    if (countEl) countEl.textContent = waiting;

    var uids = Object.keys(subsByUser);
    if (uids.length) {
      var p = await sb.from('profiles').select('id, name').in('id', uids);
      (p.data || []).forEach(function (x) { nameById[x.id] = x.name; });
    }
    render(uids);
  }

  async function judge(id, status, reason) {
    var res = await sb.from('submissions')
      .update({ review_status: status, review_reason: reason || null, reviewed_at: new Date().toISOString() })
      .eq('id', id).select();
    if (res.error) { alert('저장 실패: ' + res.error.message); return; }
    if (!res.data || !res.data.length) { alert('권한이 없어 반영되지 않았습니다. 어드민 update 정책 SQL을 확인하세요.'); return; }
    await load();
  }

  body.addEventListener('click', async function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    var path = btn.getAttribute('data-path');
    var pass = btn.getAttribute('data-pass');
    var fail = btn.getAttribute('data-fail');
    var reset = btn.getAttribute('data-reset');

    if (path) {
      var res = await sb.storage.from(BUCKET).createSignedUrl(path, 60);
      if (res.error) { alert('파일 열기 실패: ' + res.error.message); return; }
      window.open(res.data.signedUrl, '_blank');
    } else if (pass) {
      if (!confirm('통과를 확정하시겠습니까?')) return;
      await judge(pass, 'pass', null);
    } else if (fail) {
      var reason = prompt('미통과 사유를 입력하세요.');
      if (reason === null) return;              // 취소
      if (!reason.trim()) { alert('사유를 입력해야 미통과 처리됩니다.'); return; }
      await judge(fail, 'fail', reason.trim());
    } else if (reset) {
      if (!confirm('판정을 정정하시겠습니까? 다시 통과/미통과를 선택할 수 있습니다.')) return;
      await judge(reset, 'pending', null);
    }
  });

  (async function init() {
    var admin = await Auth.requireAdmin();
    if (!admin) return;
    await load();
  })();
})();
