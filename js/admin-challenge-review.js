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
  var lateOk = {};        // user_id → 지각 허용(면제) 여부

  // 지각 표시: 마감 뒤에 확정했으면. 면제 수강생은 '정상처리'로 표기
  function lateHtml(s, block) {
    var c = challenges[s.challenge_id];
    var ms = lateMs(s.submitted_at, c && c.due_at);
    if (!ms) return '';
    if (lateOk[s.user_id]) return block
      ? '<div style="font-size:0.74rem;color:var(--muted);margin-top:3px;">지각 · 정상처리(면제)</div>'
      : '<span class="ord-chip">지각 · 정상처리(면제)</span>';
    var t = '⏰ 지각 ' + esc(fmtLate(ms));
    return block ? '<div style="margin-top:3px;"><span class="tag tag--no">' + t + '</span></div>'
                 : '<span class="ord-chip" style="color:var(--danger);">' + t + '</span>';
  }
  var qs = new URLSearchParams(location.search);
  var filterId = qs.get('review') || qs.get('id') || '';   // ?review= (숙제 관리 "N건" 링크) 또는 옛 ?id=
  var statusFilter = 'pending';   // 기본 = 미검수만 (통과/미통과는 탭으로)
  var serverNow = Date.now();
  var REWORK_MS = 3 * 86400000;

  // esc 는 js/util.js 의 공통 함수 사용
  function fmtDate(iso) { return iso ? iso.slice(0, 10).replace(/-/g, '.') : '-'; }

  function reviewTag(s) {
    if (s.review_status === 'pass') return '<span class="tag tag--ok">통과</span>';
    if (s.review_status === 'fail') return '<span class="tag tag--no">미통과</span>';
    return '<span class="tag tag--wait">대기</span>';
  }

  // 미통과 건: 반려일로부터 3일 재작업 기한 남은 시간
  function remainHtml(s) {
    if (s.review_status !== 'fail' || !s.reviewed_at) return '';
    var ms = Date.parse(s.reviewed_at) + REWORK_MS - serverNow;
    if (ms <= 0) return '<div style="font-size:0.74rem;color:var(--muted);margin-top:3px;">재작업 기간 종료</div>';
    var days = Math.floor(ms / 86400000), hrs = Math.floor((ms % 86400000) / 3600000);
    return '<div style="font-size:0.74rem;color:var(--danger);margin-top:3px;">재작업 ' +
      (days > 0 ? days + '일 ' : '') + hrs + '시간 남음</div>';
  }

  function byChallenge() {
    return filterId ? subs.filter(function (s) { return String(s.challenge_id) === String(filterId); }) : subs;
  }
  function shown() {
    var list = byChallenge();
    if (statusFilter !== 'all') list = list.filter(function (s) { return s.review_status === statusFilter; });
    return list;
  }

  function renderStats() {
    var list = byChallenge();   // 통계는 상태탭과 무관하게 전체 집계
    document.getElementById('sWait').textContent = list.filter(function (s) { return s.review_status === 'pending'; }).length;
    document.getElementById('sPass').textContent = list.filter(function (s) { return s.review_status === 'pass'; }).length;
    document.getElementById('sFail').textContent = list.filter(function (s) { return s.review_status === 'fail'; }).length;
  }

  function render() {
    renderStats();
    var list = shown();
    var body = document.getElementById('revBody');
    if (!list.length) {
      body.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:40px;">' +
        (statusFilter === 'pending' ? '검수할 과제가 없습니다.' : '해당하는 제출이 없습니다.') + '</td></tr>';
      return;
    }
    body.innerHTML = list.map(function (s) {
      var c = challenges[s.challenge_id] || {};
      return '<tr>' +
        '<td>' + esc(names[s.user_id] || '-') + '</td>' +
        '<td style="text-align:left;">' + esc(c.title || '(삭제된 과제)') + '</td>' +
        '<td>' + fmtDate(s.submitted_at || s.created_at) + lateHtml(s, true) + '</td>' +
        '<td>' + reviewTag(s) + remainHtml(s) + '</td>' +
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
            lateHtml(s, false) +
          '</div>' +
          '<div class="od-card__sub">제출 내용</div>' +
          '<div style="background:#f6f7f9;border-radius:8px;padding:12px 14px;white-space:pre-wrap;' +
            'line-height:1.6;font-size:0.88rem;min-height:60px;">' +
            esc(s.content || '(내용 없음)') + '</div>' +
          (s.file_name
            ? '<div class="ch-file" style="margin-top:10px;">📎 <a href="#" id="rvFile">' +
              esc(s.file_name) + '</a></div>'
            : '') +

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
              '<label>점수 (선택)</label>' +
              '<input type="number" id="rvScore" min="0" max="100" ' +
                'value="' + (s.score != null ? s.score : '') + '" placeholder="0 ~ 100">' +
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

    // 첨부 파일: 비공개 버킷이므로 임시 서명 URL 을 만들어 연다
    var fileLink = box.querySelector('#rvFile');
    if (fileLink) fileLink.addEventListener('click', async function (e) {
      e.preventDefault();
      var r = await sb.storage.from('submissions').createSignedUrl(s.file_path, 300);
      if (r.error || !r.data) { alert('파일을 열 수 없습니다: ' + (r.error && r.error.message)); return; }
      window.open(r.data.signedUrl, '_blank');
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

  var revSegEl = document.getElementById('revSeg');   // 없는 페이지에서 로드돼도 죽지 않게
  if (revSegEl) revSegEl.addEventListener('click', function (e) {
    var b = e.target.closest('.seg__btn'); if (!b) return;
    this.querySelectorAll('.seg__btn').forEach(function (x) { x.classList.remove('is-on'); });
    b.classList.add('is-on');
    statusFilter = b.dataset.st;
    render();
  });

  async function load() {
    try { var r = await sb.rpc('server_now'); if (r && r.data) { var t = Date.parse(r.data); if (!isNaN(t)) serverNow = t; } } catch (e) {}
    // 과제
    // 선택한 기수의 숙제만 (challenges.html 의 기수 선택기). 전 기수를 한 목록에 섞지 않도록.
    var coEl = document.getElementById('cohortSel');
    var cohort = coEl ? parseInt(coEl.value, 10) : NaN;
    var chq = sb.from('challenges').select('*').order('created_at', { ascending: false });
    if (!isNaN(cohort)) chq = chq.eq('cohort', cohort);
    var ch = await chq;
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
    var pr = await sb.from('profiles').select('id, name, late_ok');
    names = {}; lateOk = {};
    (pr.data || []).forEach(function (p) { names[p.id] = p.name; lateOk[p.id] = !!p.late_ok; });

    // 제출 (대기 먼저, 최신순)
    // 제출은 기수 컬럼이 없으므로 위 숙제 id 로 한정 (숙제가 없으면 조회 생략)
    var chIds = Object.keys(challenges);
    var su = chIds.length
      ? await sb.from('challenge_submissions').select('*').in('challenge_id', chIds).order('created_at', { ascending: false })
      : { data: [] };
    // 제출 확정된 것만 검수 대상 (초안 draft 는 제외). 구버전(status 없음/submitted)은 포함.
    subs = (su.data || []).filter(function (s) { return s.status !== 'draft'; }).sort(function (a, b) {
      var order = { pending: 0, fail: 1, pass: 2 };
      return (order[a.review_status] || 0) - (order[b.review_status] || 0);
    });

    render();
  }

  // 기수를 바꾸면 검수 탭이 보이는 동안만 다시 로드 (등록·현황판은 각자 처리)
  var coSelEl = document.getElementById('cohortSel');
  if (coSelEl) coSelEl.addEventListener('change', function () {
    var t = document.getElementById('tab-review');
    if (t && !t.hidden) load();
  });
  window.ChallengeReview = { load: load };   // 탭 전환 시 challenges.html 이 호출

  (async function init() {
    var admin = await Auth.requireAdmin();
    if (!admin) return;
    await load();
  })();
})();
