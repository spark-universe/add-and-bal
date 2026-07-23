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
  var practiceTopic = '';

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

  /* ---------- 발주 연습 손익 (order-result 의 net 계산과 동일 규칙) ---------- */
  function practiceNet() {
    var orders = [], plan = null;
    try { orders = JSON.parse(localStorage.getItem('practice_orders')) || []; } catch (e) {}
    try { plan = JSON.parse(localStorage.getItem('practice_plan')); } catch (e) {}
    var total = plan ? plan.total : orders.length;
    var processed = orders.filter(function (o) { return o.fulfillment !== 'unfulfilled'; }).length;
    var net = 0, sales = 0;
    orders.forEach(function (o) {
      if (o.fulfillment !== 'fulfilled') return;   // 환불/미처리는 손익 0
      var cost = Number(o.cost) || 0, tot = Number(o.total) || 0;
      var sourced = (o.amazon && typeof o.amazon.sourcedCost === 'number') ? o.amazon.sourcedCost : cost;
      var isCb = o.chargebackFired || o.issue === 'chargeback';
      if (isCb) {
        if (o.chargeback && o.chargeback.status === 'won') { net += (tot - sourced); sales += tot; }
        else { net -= (o.chargeback && o.chargeback.loss) || (cost + 15); }
      } else if (o.amazon && o.amazon.misship) { net -= sourced; }
      else if (o.lateRefund) { net -= sourced; }
      else { net += (tot - sourced); sales += tot; }
    });
    return {
      net: round2(net), sales: round2(sales),
      hasData: orders.length > 0, total: total, processed: processed,
      allDone: total > 0 && orders.length === total && processed === total
    };
  }

  function renderSummary() {
    var box = document.getElementById('pnlSummary');
    if (!box) return;
    var pn = practiceNet();
    var pl = null; try { pl = JSON.parse(localStorage.getItem('practice_plan')); } catch (e) {}
    var planSig = pl ? pl.sig : null;
    var mine = practiceTopic ? campaigns.filter(function (c) { return c.category === practiceTopic && (c.status === 'active' || c.runSig === planSig); }) : campaigns;
    var adSpend = round2(mine.reduce(function (a, c) { return a + (Number(c.spend) || 0); }, 0));
    var finalNet = round2(pn.net - adSpend);
    var fcls = finalNet >= 0 ? 'is-pos' : 'is-neg';

    var body;
    if (!pn.hasData) {
      body = '<div style="padding:16px 20px;color:var(--muted);font-size:0.9rem;">아직 발주 연습 기록이 없습니다. ' +
        '광고비를 쓰면 여기서 <b>광고 반영 손익</b>을 볼 수 있습니다.</div>';
    } else {
      body = '<table class="breakdown">' +
        '<tr><td>발주 연습 영업 손익' + (pn.allDone ? '' : ' <span style="color:var(--muted);font-weight:600;">(처리중 ' + pn.processed + '/' + pn.total + ')</span>') + '</td>' +
          '<td class="r ' + (pn.net >= 0 ? 'is-pos' : 'is-neg') + '">' + money(pn.net) + '</td></tr>' +
        '<tr><td>광고비 (' + (practiceTopic ? '이 주제 ' : '') + mine.length + '개 캠페인)</td><td class="r is-neg">' + money(-adSpend) + '</td></tr>' +
        '<tr class="total"><td>최종 순이익 (광고비 반영)</td><td class="r ' + fcls + '">' + money(finalNet) + '</td></tr>' +
        '</table>';
    }

    box.className = 'panel';
    box.style.marginBottom = '18px';
    box.innerHTML =
      '<div class="panel__head"><span>발주 연습 손익 (광고비 반영)' + (practiceTopic ? ' · ' + esc(practiceTopic) : '') + '</span>' +
        '<button class="btn-sm is-danger" id="resetRecordsBtn">🗑 발주 기록 초기화</button></div>' +
      body;

    document.getElementById('resetRecordsBtn').addEventListener('click', resetRecords);
  }

  function resetRecords() {
    if (!confirm('발주 연습 기록(받은 주문 · 소싱 · 차지백)을 지웁니다.\n설정한 광고 캠페인은 그대로 유지됩니다.\n정말 초기화할까요?')) return;
    ['practice_orders', 'practice_plan', 'practice_chargebacks'].forEach(function (k) {
      localStorage.removeItem(k);
    });
    render();   // 손익 요약 갱신 (광고 캠페인은 유지)
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
    renderSummary();
  }

  /* ---------- 캠페인 만들기 → 별도 화면 ---------- */
  function openCreate() { location.href = 'ad-campaign.html'; }

  /* ---------- 이벤트 ---------- */
  document.getElementById('createBtn').addEventListener('click', openCreate);
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
    try {
      var s = await sb.from('practice_settings').select('topic').eq('user_id', user.id).maybeSingle();
      practiceTopic = (s.data && s.data.topic) || '';
    } catch (e) {}
    load();
    render();
  })();
})();
