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

  /* ---------- 캠페인 만들기 → 별도 화면 ---------- */
  function openCreate() { location.href = 'ad-campaign.html'; }

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
