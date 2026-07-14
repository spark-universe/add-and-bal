/* =========================================================
   광고 설정하기 — Advertising (쇼피파이 재현)
   - [Create campaign] 으로 광고 캠페인을 만든다
   - 캠페인이 하나도 없으면 상단 지표는 전부 0 (캡처본은 캠페인 3개를 만든 상태)
   - 캠페인마다 성과(Sales · Spend · ROAS · CAC · AOV · Customers)가 생성되고,
     상단 지표는 그 합계/평균으로 계산된다
   - 캠페인은 브라우저(localStorage)에 저장 → 새로고침해도 유지
   - TODO: 성과를 어드민 결과 집계로 보내기 (다음 단계)
   ========================================================= */
(function () {
  var STORE = 'ad_campaigns';
  var COUNTRIES = ['United States', 'United Kingdom', 'Australia', 'Germany', 'Canada'];

  var campaigns = [];
  var tab = 'all';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function money(n, d) { return '$' + Number(n || 0).toFixed(d == null ? 2 : d); }
  function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
  function randF(a, b) { return Math.random() * (b - a) + a; }
  function round2(n) { return Math.round(n * 100) / 100; }

  var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso + 'T00:00:00');
    return MON[d.getMonth()] + ' ' + d.getDate();
  }

  function load() {
    try { campaigns = JSON.parse(localStorage.getItem(STORE)) || []; } catch (e) { campaigns = []; }
  }
  function save() { localStorage.setItem(STORE, JSON.stringify(campaigns)); }

  /* ---------- 캠페인 성과 시뮬레이션 ----------
     광고비(일 예산 × 집행일)를 쓰면 그만큼 매출이 나온다.
     ROAS(광고 수익률)는 캠페인마다 다르게 나오고, 그게 캠페인의 성패가 된다. */
  function simulate(c) {
    var days = c.end
      ? Math.max(1, Math.round((new Date(c.end) - new Date(c.start)) / 86400000))
      : randInt(4, 12);
    days = Math.min(days, 30);

    var spend = round2(c.budget * days * randF(0.85, 1.05));   // 예산을 다 못 쓰기도 한다
    var roas = round2(randF(2.2, 8.5));                        // 광고비 1달러당 매출
    var sales = round2(spend * roas);
    var aov = round2(randF(45, 145));                          // 객단가
    var customers = Math.max(1, Math.round(sales / aov));
    var cac = round2(spend / customers);                       // 고객 1명 얻는 데 든 광고비

    c.spend = spend;
    c.sales = sales;
    c.roas = roas;
    c.aov = aov;
    c.customers = customers;
    c.cac = cac;
    // ROAS 가 너무 낮으면 경고(TOV = 광고 목표 미달) 를 띄운다
    c.alert = roas < 3 ? 'TOV' : null;
  }

  /* ---------- 상단 지표 (모든 캠페인 합계) ---------- */
  function renderMetrics() {
    var sales = 0, spend = 0, customers = 0;
    campaigns.forEach(function (c) {
      sales += c.sales; spend += c.spend; customers += c.customers;
    });
    var aov = customers ? sales / customers : 0;
    var cac = customers ? spend / customers : 0;
    var roas = spend ? sales / spend : 0;

    document.getElementById('mCust').textContent = customers;
    document.getElementById('mAov').textContent = money(aov);
    document.getElementById('mSales').textContent = money(sales, 0);
    document.getElementById('mSpend').textContent = money(spend, 0);
    document.getElementById('mCac').textContent = money(cac);
    document.getElementById('mRoas').textContent = roas ? roas.toFixed(1) : '0';
  }

  /* ---------- 캠페인 표 ---------- */
  function shown() {
    if (tab === 'active') return campaigns.filter(function (c) { return c.status === 'active'; });
    if (tab === 'completed') return campaigns.filter(function (c) { return c.status === 'completed'; });
    return campaigns;
  }

  function render() {
    var list = shown();
    var body = document.getElementById('advBody');

    if (!list.length) {
      body.innerHTML = '<tr><td colspan="14" style="text-align:center;color:var(--muted);padding:48px;">' +
        (campaigns.length
          ? '이 조건에 맞는 캠페인이 없습니다.'
          : '아직 캠페인이 없습니다. 우측 상단 <b>[Create campaign]</b> 으로 광고 캠페인을 만들어보세요.') +
        '</td></tr>';
    } else {
      body.innerHTML = list.map(function (c) {
        return '<tr data-id="' + c.id + '">' +
          '<td class="ord-cust" style="color:var(--primary);">' + esc(c.name) + '</td>' +
          '<td>' + (c.alert ? '<span class="risk-badge med">⚠ ' + esc(c.alert) + '</span>' : '') + '</td>' +
          '<td>' + (c.status === 'active'
            ? '<span class="adv-status on">Active</span>'
            : '<span class="adv-status">Completed</span>') + '</td>' +
          '<td>' + esc(c.segment) + '</td>' +
          '<td class="r">' + money(c.sales) + '</td>' +
          '<td class="r">' + money(c.cac) + '</td>' +
          '<td class="r">' + c.roas.toFixed(2) + '</td>' +
          '<td class="r">' + c.customers + '</td>' +
          '<td class="r">' + money(c.aov) + '</td>' +
          '<td class="r">' + money(c.spend) + '</td>' +
          '<td>' + esc(c.country) + '</td>' +
          '<td>' + fmtDate(c.start) + '</td>' +
          '<td>' + (c.end ? fmtDate(c.end) : '') + '</td>' +
          '<td><button class="btn-sm is-danger" data-del="' + c.id + '">삭제</button></td>' +
        '</tr>';
      }).join('');
    }

    document.getElementById('advCount').textContent = campaigns.length
      ? campaigns.length + '개 캠페인' : '';
    document.getElementById('advUpdated').textContent = campaigns.length
      ? 'Last updated ' + new Date().toLocaleDateString() : '';
    renderMetrics();
  }

  /* ---------- 캠페인 만들기 ---------- */
  function openCreate() {
    var today = new Date().toISOString().slice(0, 10);

    var box = document.createElement('div');
    box.className = 'modal-overlay is-open';
    box.innerHTML =
      '<div class="modal-card" style="max-width:560px;">' +
        '<div class="modal-card__head">' +
          '<h3>Create campaign</h3>' +
          '<button class="modal-close" data-close>×</button>' +
        '</div>' +
        '<div class="modal-card__body">' +
          '<div class="ff-guide">' +
            '📢 광고 캠페인은 <b>일 예산 × 집행 기간</b> 만큼 광고비를 씁니다.<br>' +
            '<span class="od-muted">광고비 1달러로 매출을 얼마나 냈는지가 <b>ROAS</b>입니다. ' +
            'ROAS 3 미만이면 경고가 뜹니다.</span>' +
          '</div>' +
          '<div class="prod-form">' +
            '<div class="field" style="grid-column:1/-1;">' +
              '<label>캠페인 이름 <span style="color:var(--danger);">*</span></label>' +
              '<input type="text" id="cName" placeholder="예: 새 캠페인 01">' +
            '</div>' +
            '<div class="field">' +
              '<label>일 예산 ($) <span style="color:var(--danger);">*</span></label>' +
              '<input type="number" id="cBudget" min="1" step="1" placeholder="50">' +
            '</div>' +
            '<div class="field">' +
              '<label>대상 국가</label>' +
              '<select id="cCountry" style="width:100%;padding:11px 12px;border:1px solid var(--border);border-radius:8px;font-size:0.88rem;">' +
                COUNTRIES.map(function (c) { return '<option>' + c + '</option>'; }).join('') +
              '</select>' +
            '</div>' +
            '<div class="field">' +
              '<label>시작일</label>' +
              '<input type="date" id="cStart" value="' + today + '">' +
            '</div>' +
            '<div class="field">' +
              '<label>종료일 (비우면 진행 중)</label>' +
              '<input type="date" id="cEnd">' +
            '</div>' +
          '</div>' +
          '<div id="cError" style="color:var(--danger);font-size:0.82rem;"></div>' +
        '</div>' +
        '<div class="modal-card__foot">' +
          '<button class="btn-sm" data-close>취소</button>' +
          '<button class="btn-sm is-dark" id="cGo">캠페인 만들기</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(box);

    box.addEventListener('click', function (e) {
      if (e.target === box || e.target.closest('[data-close]')) box.remove();
    });

    box.querySelector('#cGo').addEventListener('click', function () {
      var name = box.querySelector('#cName').value.trim();
      var budget = parseFloat(box.querySelector('#cBudget').value);
      var start = box.querySelector('#cStart').value;
      var end = box.querySelector('#cEnd').value;
      var err = box.querySelector('#cError');

      if (!name) { err.textContent = '캠페인 이름을 입력하세요.'; return; }
      if (!isFinite(budget) || budget <= 0) { err.textContent = '일 예산을 입력하세요.'; return; }
      if (end && end < start) { err.textContent = '종료일이 시작일보다 빠릅니다.'; return; }

      var c = {
        id: Date.now(),
        name: name,
        budget: budget,
        country: box.querySelector('#cCountry').value,
        segment: 'All',
        start: start,
        end: end || null,
        status: end && end <= new Date().toISOString().slice(0, 10) ? 'completed' : 'active',
      };
      simulate(c);
      campaigns.unshift(c);
      save();
      box.remove();
      render();
    });
  }

  /* ---------- 이벤트 ---------- */
  document.getElementById('createBtn').addEventListener('click', openCreate);
  document.getElementById('bannerCreate').addEventListener('click', openCreate);
  document.getElementById('bannerClose').addEventListener('click', function () {
    document.getElementById('advBanner').remove();
  });
  document.getElementById('manageBtn').addEventListener('click', function () {
    alert('채널 관리는 이 연습에서 사용되지 않습니다.');
  });
  document.getElementById('moreBtn').addEventListener('click', function () {
    alert('추가 기능은 이 연습에서 사용되지 않습니다.');
  });

  document.querySelectorAll('.adv-tab').forEach(function (el) {
    el.addEventListener('click', function () {
      document.querySelectorAll('.adv-tab').forEach(function (x) { x.classList.remove('is-on'); });
      this.classList.add('is-on');
      tab = this.dataset.tab;
      render();
    });
  });

  document.getElementById('advBody').addEventListener('click', function (e) {
    var del = e.target.closest('button[data-del]');
    if (!del) return;
    var id = Number(del.dataset.del);
    var c = campaigns.find(function (x) { return x.id === id; });
    if (!c) return;
    if (!confirm('정말로 삭제하시겠습니까?\n\n캠페인 "' + c.name + '"')) return;
    campaigns = campaigns.filter(function (x) { return x.id !== id; });
    save();
    render();
  });

  (async function init() {
    var user = await Auth.require();
    if (!user) return;
    load();
    render();
  })();
})();
