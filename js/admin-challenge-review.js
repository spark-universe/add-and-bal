/* =========================================================
   어드민 · 과제 검수
   - challenge_submissions 를 과제/수강생별로 확인
   - 제출 내용 보고 통과 / 미통과 + 점수 + 사유 입력
   - ?id=N 으로 들어오면 그 과제만 필터
   ========================================================= */
(function () {
  var subs = [];         // 제출 목록 (조인 대신 별도 조회 후 합침)
  var challenges = {};    // id → challenge
  var names = {};         // user_id → 이름
  var filterId = new URLSearchParams(location.search).get('id') || '';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function fmtDate(iso) { return iso ? iso.slice(0, 10).replace(/-/g, '.') : '-'; }

  function reviewTag(s) {
    if (s.review_status === 'pass') return '<span class="tag tag--ok">통과</span>';
    if (s.review_status === 'fail') return '<span class="tag tag--no">미통과</span>';
    return '<span class="tag tag--wait">대기</span>';
  }

  function shown() {
    return filterId ? subs.filter(function (s) { return String(s.challenge_id) === String(filterId); }) : subs;
  }

  function renderStats() {
    var list = shown();
    document.getElementById('sWait').textContent = list.filter(function (s) { return s.review_status === 'pending'; }).length;
    document.getElementById('sPass').textContent = list.filter(function (s) { return s.review_status === 'pass'; }).length;
    document.getElementById('sFail').textContent = list.filter(function (s) { return s.review_status === 'fail'; }).length;
  }

  function render() {
    renderStats();
    var list = shown();
    var body = document.getElementById('revBody');
    if (!list.length) {
      body.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:40px;">제출된 과제가 없습니다.</td></tr>';
      return;
    }
    body.innerHTML = list.map(function (s) {
      var c = challenges[s.challenge_id] || {};
      return '<tr>' +
        '<td>' + esc(names[s.user_id] || '-') + '</td>' +
        '<td style="text-align:left;">' + esc(c.title || '(삭제된 과제)') + '</td>' +
        '<td>' + fmtDate(s.created_at) + '</td>' +
        '<td>' + reviewTag(s) + '</td>' +
        '<td>' + (s.score != null ? s.score + '점' : '-') + '</td>' +
        '<td><button class="btn-sm is-primary" data-open="' + s.id + '">검수</button></td>' +
      '</tr>';
    }).join('');
  }

  function openReview(s) {
    var c = challenges[s.challenge_id] || {};
    var box = document.createElement('div');
    box.className = 'modal-overlay is-open';
    box.innerHTML =
      '<div class="modal-card" style="max-width:560px;">' +
        '<div class="modal-card__head">' +
          '<h3>과제 검수</h3>' +
          '<button class="modal-close" data-close>×</button>' +
        '</div>' +
        '<div class="modal-card__body">' +
          '<div class="ch-meta">' +
            '<span class="ord-chip">' + esc(names[s.user_id] || '-') + '</span>' +
            '<span class="ord-chip">' + esc(c.title || '-') + '</span>' +
            '<span class="ord-chip">배점 ' + (c.points || 0) + '점</span>' +
          '</div>' +
          '<div class="od-card__sub">제출 내용</div>' +
          '<div style="background:#f6f7f9;border-radius:8px;padding:12px 14px;white-space:pre-wrap;' +
            'line-height:1.6;font-size:0.88rem;min-height:60px;">' +
            esc(s.content || '(내용 없음)') + '</div>' +

          '<div class="prod-form" style="margin-top:16px;">' +
            '<div class="field">' +
              '<label>판정</label>' +
              '<select id="rvStatus" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:8px;font-size:0.88rem;">' +
                '<option value="pending"' + (s.review_status === 'pending' ? ' selected' : '') + '>대기</option>' +
                '<option value="pass"' + (s.review_status === 'pass' ? ' selected' : '') + '>통과</option>' +
                '<option value="fail"' + (s.review_status === 'fail' ? ' selected' : '') + '>미통과</option>' +
              '</select>' +
            '</div>' +
            '<div class="field">' +
              '<label>점수</label>' +
              '<input type="number" id="rvScore" min="0" max="' + (c.points || 100) + '" ' +
                'value="' + (s.score != null ? s.score : '') + '" placeholder="0 ~ ' + (c.points || 0) + '">' +
            '</div>' +
          '</div>' +
          '<div class="field">' +
            '<label>사유 / 피드백 (미통과 시 특히)</label>' +
            '<textarea id="rvReason" rows="3" placeholder="수강생에게 보일 피드백을 적어주세요."' +
              ' style="width:100%;padding:11px;border:1px solid var(--border);border-radius:8px;font-family:inherit;font-size:0.88rem;resize:vertical;">' +
              esc(s.review_reason || '') + '</textarea>' +
          '</div>' +
          '<div id="rvErr" style="color:var(--danger);font-size:0.82rem;"></div>' +
        '</div>' +
        '<div class="modal-card__foot">' +
          '<button class="btn-sm" data-close>취소</button>' +
          '<button class="btn-sm is-primary" id="rvSave">저장</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(box);

    box.addEventListener('click', function (e) {
      if (e.target === box || e.target.closest('[data-close]')) box.remove();
    });

    box.querySelector('#rvSave').addEventListener('click', async function () {
      var status = box.querySelector('#rvStatus').value;
      var scoreVal = box.querySelector('#rvScore').value;
      var score = scoreVal === '' ? null : parseInt(scoreVal, 10);
      var reason = box.querySelector('#rvReason').value.trim() || null;

      this.disabled = true;
      var res = await sb.from('challenge_submissions').update({
        review_status: status,
        score: score,
        review_reason: reason,
        reviewed_at: new Date().toISOString(),
      }).eq('id', s.id);

      if (res.error) {
        this.disabled = false;
        box.querySelector('#rvErr').textContent = '저장 실패: ' + res.error.message;
        return;
      }
      box.remove();
      await load();
    });
  }

  document.getElementById('revBody').addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-open]');
    if (!btn) return;
    var s = subs.find(function (x) { return x.id === Number(btn.dataset.open); });
    if (s) openReview(s);
  });

  document.getElementById('chFilter').addEventListener('change', function () {
    filterId = this.value;
    render();
  });

  async function load() {
    // 과제
    var ch = await sb.from('challenges').select('*').order('created_at', { ascending: false });
    challenges = {};
    var opts = '<option value="">전체 과제</option>';
    (ch.data || []).forEach(function (c) {
      challenges[c.id] = c;
      opts += '<option value="' + c.id + '">' + esc(c.title) + '</option>';
    });
    var filterEl = document.getElementById('chFilter');
    filterEl.innerHTML = opts;
    filterEl.value = filterId;

    // 수강생 이름
    var pr = await sb.from('profiles').select('id, name');
    names = {};
    (pr.data || []).forEach(function (p) { names[p.id] = p.name; });

    // 제출 (대기 먼저, 최신순)
    var su = await sb.from('challenge_submissions').select('*').order('created_at', { ascending: false });
    subs = (su.data || []).sort(function (a, b) {
      var order = { pending: 0, fail: 1, pass: 2 };
      return (order[a.review_status] || 0) - (order[b.review_status] || 0);
    });

    render();
  }

  (async function init() {
    var admin = await Auth.requireAdmin();
    if (!admin) return;
    await load();
  })();
})();
