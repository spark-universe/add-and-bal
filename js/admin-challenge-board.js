/* =========================================================
   어드민 · 과제 현황판 (수강생 × 숙제 매트릭스)
   - 선택한 기수의 수강생(행) × 숙제(열) 로 제출/검수 상태를 한눈에
   - 셀 클릭 → 바로 채점(통과/미통과/점수), 숙제(열)별 '일괄 통과'
   - esc / sb 는 공용 전역 사용. window.ChallengeBoard.load() 로 로드.
   ========================================================= */
(function () {
  var wrap = document.getElementById('boardWrap');
  if (!wrap) return;
  var cohortSel = document.getElementById('cohortSel');
  var students = [], challenges = [], subs = {};

  function cohort() { return parseInt(cohortSel ? cohortSel.value : '0', 10) || 0; }

  async function load() {
    wrap.innerHTML = '<div class="bd-empty">불러오는 중...</div>';
    var co = cohort();
    var pr = await sb.from('profiles').select('id,name').eq('status', 'approved').eq('cohort', co).order('name');
    students = pr.data || [];
    var ch = await sb.from('challenges').select('*').eq('cohort', co);
    challenges = (ch.data || []).sort(function (a, b) {
      var ta = a.open_at ? Date.parse(a.open_at) : (a.due_at ? Date.parse(a.due_at) : 0);
      var tb = b.open_at ? Date.parse(b.open_at) : (b.due_at ? Date.parse(b.due_at) : 0);
      return ta - tb;
    });
    subs = {};
    if (challenges.length && students.length) {
      var ids = challenges.map(function (c) { return c.id; });
      var su = await sb.from('challenge_submissions').select('*').in('challenge_id', ids);
      (su.data || []).forEach(function (s) { (subs[s.user_id] = subs[s.user_id] || {})[s.challenge_id] = s; });
    }
    render();
  }

  function cellInfo(u, c) {
    var s = (subs[u.id] || {})[c.id];
    if (!s) return { cls: 'bd-none', txt: '–' };
    if (s.status === 'draft') return { cls: 'bd-draft', txt: '초안', s: s };  // 제출만·미확정 = 채점 불가
    if (s.review_status === 'pass') return { cls: 'bd-pass', txt: (s.score != null ? String(s.score) : '통과'), s: s, grade: true };
    if (s.review_status === 'fail') return { cls: 'bd-fail', txt: '미통과', s: s, grade: true };
    return { cls: 'bd-wait', txt: '검수', s: s, grade: true };
  }

  function render() {
    if (!challenges.length) { wrap.innerHTML = '<div class="bd-empty">이 기수에 등록된 숙제가 없습니다.</div>'; return; }
    if (!students.length) { wrap.innerHTML = '<div class="bd-empty">이 기수에 승인된 수강생이 없습니다.</div>'; return; }
    var head = '<th class="bd-stick bd-corner">수강생</th>' + challenges.map(function (c) {
      return '<th class="bd-colh"><div class="bd-colttl" title="' + esc(c.title) + '">' + esc(c.title) + '</div>' +
        '<button class="bd-bulk" data-bulk="' + c.id + '">일괄 통과</button></th>';
    }).join('');
    var rows = students.map(function (u) {
      var tds = challenges.map(function (c) {
        var ci = cellInfo(u, c);
        var at = ci.grade ? (' data-cell="' + u.id + '|' + c.id + '" role="button" tabindex="0"') : '';
        return '<td class="bd-cell ' + ci.cls + '"' + at + '>' + ci.txt + '</td>';
      }).join('');
      return '<tr><td class="bd-stick bd-name" title="' + esc(u.name || '') + '">' + esc(u.name || '-') + '</td>' + tds + '</tr>';
    }).join('');
    wrap.innerHTML = '<div class="bd-legend">' +
      '<span class="bd-lg bd-pass">통과·점수</span><span class="bd-lg bd-wait">검수 대기</span>' +
      '<span class="bd-lg bd-fail">미통과</span><span class="bd-lg bd-draft">초안(미확정)</span><span class="bd-lg bd-noneleg">미제출</span>' +
      '<span style="color:var(--muted);">· 셀을 클릭하면 채점할 수 있어요</span></div>' +
      '<div class="bd-scroll"><table class="bd-table"><thead><tr>' + head + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  // 셀 클릭 → 채점 팝업
  function openGrade(uid, cid) {
    var s = (subs[uid] || {})[cid]; if (!s) return;
    var u = students.find(function (x) { return x.id === uid; }) || {};
    var c = challenges.find(function (x) { return x.id === cid; }) || {};
    var box = document.createElement('div');
    box.className = 'modal-overlay is-open';
    box.innerHTML =
      '<div class="modal-card" style="max-width:440px;">' +
        '<div class="modal-card__head"><h3>채점 — ' + esc(u.name || '') + '</h3>' +
          '<button class="modal-close" data-close>×</button></div>' +
        '<div class="modal-card__body">' +
          '<div style="font-size:0.86rem;color:var(--muted);margin-bottom:12px;">' + esc(c.title || '') + '</div>' +
          (s.content ? '<div class="field"><label>제출 내용</label><div style="white-space:pre-wrap;font-size:0.88rem;background:#f6f7f9;border-radius:8px;padding:10px 12px;word-break:break-word;">' + esc(s.content) + '</div></div>' : '') +
          '<div class="field"><label>결과</label><select id="bgStatus" style="width:100%;padding:9px;border:1px solid var(--border);border-radius:8px;">' +
            '<option value="pending"' + (s.review_status === 'pending' ? ' selected' : '') + '>대기</option>' +
            '<option value="pass"' + (s.review_status === 'pass' ? ' selected' : '') + '>통과</option>' +
            '<option value="fail"' + (s.review_status === 'fail' ? ' selected' : '') + '>미통과</option>' +
          '</select></div>' +
          '<div class="field"><label>점수 (0~100, 선택)</label><input type="number" id="bgScore" min="0" max="100" value="' + (s.score != null ? s.score : '') + '" style="width:100%;padding:9px;border:1px solid var(--border);border-radius:8px;"></div>' +
          '<div class="field"><label>사유 (선택)</label><input type="text" id="bgReason" value="' + esc(s.review_reason || '') + '" style="width:100%;padding:9px;border:1px solid var(--border);border-radius:8px;"></div>' +
          '<div id="bgErr" style="color:var(--danger);font-size:0.82rem;"></div>' +
        '</div>' +
        '<div class="modal-card__foot"><button class="btn-sm" data-close>닫기</button>' +
          '<button class="btn-sm is-primary" id="bgSave">저장</button></div>' +
      '</div>';
    document.body.appendChild(box);
    box.addEventListener('click', function (e) { if (e.target === box || e.target.closest('[data-close]')) box.remove(); });
    box.querySelector('#bgSave').addEventListener('click', async function () {
      var status = box.querySelector('#bgStatus').value;
      var sv = box.querySelector('#bgScore').value;
      var score = sv === '' ? null : parseInt(sv, 10);
      var reason = box.querySelector('#bgReason').value.trim() || null;
      var now = new Date().toISOString();
      this.disabled = true;
      var res = await sb.from('challenge_submissions')
        .update({ review_status: status, score: score, review_reason: reason, reviewed_at: now })
        .eq('id', s.id).select();
      if (res.error || !res.data || !res.data.length) {
        this.disabled = false;
        box.querySelector('#bgErr').textContent = '저장 실패' + (res.error ? ': ' + res.error.message : ' (권한/정책 확인)');
        return;
      }
      s.review_status = status; s.score = score; s.review_reason = reason; s.reviewed_at = now;
      box.remove(); render();
    });
  }

  // 숙제(열)별 일괄 통과 — 제출 확정 + 검수 대기건만
  async function bulkPass(cid) {
    var c = challenges.find(function (x) { return x.id === cid; }) || {};
    var targets = [];
    students.forEach(function (u) {
      var s = (subs[u.id] || {})[cid];
      if (s && s.status !== 'draft' && s.review_status === 'pending') targets.push(s);
    });
    if (!targets.length) { alert('"' + (c.title || '') + '"에 검수 대기 중인(제출 확정) 항목이 없습니다.'); return; }
    if (!confirm('"' + (c.title || '') + '"의 검수 대기 ' + targets.length + '건을 모두 통과 처리할까요?')) return;
    var ids = targets.map(function (s) { return s.id; });
    var now = new Date().toISOString();
    var res = await sb.from('challenge_submissions').update({ review_status: 'pass', reviewed_at: now }).in('id', ids).select('id');
    if (res.error) { alert('일괄 통과 실패: ' + res.error.message); return; }
    var okIds = {}; (res.data || []).forEach(function (r) { okIds[r.id] = 1; });
    targets.forEach(function (s) { if (okIds[s.id]) { s.review_status = 'pass'; s.reviewed_at = now; } });
    render();
    alert((res.data || []).length + '건 통과 처리 완료');
  }

  wrap.addEventListener('click', function (e) {
    var bulk = e.target.closest('[data-bulk]');
    if (bulk) { bulkPass(Number(bulk.dataset.bulk)); return; }
    var cell = e.target.closest('[data-cell]');
    if (cell) { var p = cell.dataset.cell.split('|'); openGrade(Number(p[0]), Number(p[1])); }
  });

  if (cohortSel) cohortSel.addEventListener('change', function () {
    var t = document.getElementById('tab-board');
    if (t && !t.hidden) load();
  });

  window.ChallengeBoard = { load: load };
})();
