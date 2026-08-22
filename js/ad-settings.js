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
  var selectedIds = {};        // 체크박스로 고른 캠페인 id
  var onlySelected = false;     // '선택만 보기' 켜짐 여부
  function selCount() { return Object.keys(selectedIds).length; }
  var metricRange = 'week';          // 상단 지표 기간: day | week | month
  var RANGE_MS = { day: 86400000, week: 7 * 86400000, month: 30 * 86400000 };

  // 선택한 기간 안에 들어온 주문만 (ts = 주문을 받은 시각). ts 없는 옛 주문은 포함.
  function inRange(o) {
    var win = RANGE_MS[metricRange];
    if (!win || !o || o.ts == null) return true;
    return o.ts >= Date.now() - win;
  }

  // esc/money/randInt/round2/campForOrder/adSpendLive/campaignLive 는 js/util.js 의 공통 함수 사용
  function randF(a, b) { return Math.random() * (b - a) + a; }

  // 이번 연습(현재 주제·런)에 속한 캠페인 + 그 주문들
  function runContext() {
    var pl = null; try { pl = JSON.parse(simStore().getItem('practice_plan')); } catch (e) {}
    var sig = pl ? pl.sig : null;
    var mine = practiceTopic ? campaigns.filter(function (c) { return c.category === practiceTopic && (c.status === 'active' || c.runSig === sig); }) : [];
    var orders = []; try { orders = JSON.parse(simStore().getItem('practice_orders')) || []; } catch (e) {}
    return { mine: mine, names: mine.map(function (c) { return c.name; }), orders: orders };
  }


  var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso + 'T00:00:00');
    return MON[d.getMonth()] + ' ' + d.getDate();
  }

  function load() {
    try { campaigns = JSON.parse(simStore().getItem(STORE)) || []; } catch (e) { campaigns = []; }
  }
  function save() { simStore().setItem(STORE, JSON.stringify(campaigns)); }

  /* ---------- 데모 계정 전용 진단 케이스 심기 ----------
     is_demo 계정으로 접속하면 문제 있는 광고 3개를 세션에 깔아둔다.
     탭(sessionStorage)마다 따로 생기고, 일반 계정에는 절대 안 뜬다. */
  var SEED_V = 5;   // 케이스 데이터 버전 — 올리면 예전 세션의 시드도 새로 갱신됨
  function buildCaseCampaign(cs, i) {
    var p = cs.perf || { customers: 0, spend: 0, sales: 0, startDaysAgo: 0 };
    var d = new Date(); d.setDate(d.getDate() - (p.startDaysAgo || 0));
    var start = d.toISOString().slice(0, 10);
    var customers = p.customers || 0, spend = p.spend || 0, sales = p.sales || 0;
    return {
      id: 900000001 + i,          // 데모 케이스 고정 id
      demoCase: cs.key, seedV: SEED_V,
      name: cs.name,
      note: cs.note,
      budget: cs.budget,
      country: 'United States',
      segment: 'All',
      tov: cs.tov,
      cacs: [{ name: '전체 고객', value: cs.cac }],
      cacAll: cs.cac,
      segsRaw: [],
      targetCac: cs.cac,          // 설정값(수정 대상). 설계 ROAS = tov/cac
      category: '',
      start: start, end: null,
      status: 'active',
      // 실제 성과 (주어진 고정값) → 표·상단바에 표시
      customers: customers, spend: spend, sales: sales,
      cac: customers ? round2(spend / customers) : 0,
      aov: customers ? round2(sales / customers) : 0,
      roas: spend ? round2(sales / spend) : 0,
      alert: null, resolved: false
    };
  }
  function seedDemoCases() {
    if (!window.__demoSim || !window.AD_DEMO_CASES) return;
    var byCase = {};
    campaigns.forEach(function (c) { if (c.demoCase) byCase[c.demoCase] = c; });
    var changed = false;
    window.AD_DEMO_CASES.forEach(function (cs, i) {
      var ex = byCase[cs.key];
      if (ex && ex.seedV === SEED_V) return;                 // 최신이면 그대로 둠
      if (ex && !ex.resolved) campaigns = campaigns.filter(function (c) { return c !== ex; }); // 오래된 시드(미수정)만 교체
      else if (ex) return;                                   // 이미 수정한 케이스는 보존
      campaigns.push(buildCaseCampaign(cs, i));
      changed = true;
    });
    if (changed) save();
  }

  /* ---------- 상단 지표 (이번 연습 광고의 실시간 성과) ---------- */
  function renderMetrics() {
    var ctx = runContext();
    var orders = ctx.orders.filter(inRange);      // 선택한 기간(하루/일주일/한달)의 주문만

    // 체크박스로 고른 캠페인이 있으면 그 캠페인들만, 없으면 이번 연습(run) 캠페인 전체
    var target = selCount()
      ? campaigns.filter(function (c) { return selectedIds[c.id]; })
      : ctx.mine;

    var sales = 0, spend = 0, customers = 0;
    target.forEach(function (c) {
      var m;
      if (ctx.names.indexOf(c.name) !== -1) {
        m = campaignLive(c, orders, ctx.names);   // 이번 연습 런: 실제 주문 기반
      } else {
        // 그 외(데모 케이스 등)는 캠페인에 저장된 값(= 주어질 매출·광고비)을 사용
        m = { sales: Number(c.sales) || 0, spend: Number(c.spend) || 0, customers: Number(c.customers) || 0 };
      }
      sales += m.sales; spend += m.spend; customers += m.customers;
    });

    var aov = customers ? sales / customers : 0;
    var cac = customers ? spend / customers : 0;
    var roas = spend ? sales / spend : 0;

    var scope = document.getElementById('advMetricScope');
    if (scope) scope.textContent = selCount() ? '· 선택 ' + selCount() + '개' : '';

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
    try { orders = JSON.parse(simStore().getItem('practice_orders')) || []; } catch (e) {}
    try { plan = JSON.parse(simStore().getItem('practice_plan')); } catch (e) {}
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
    var pl = null; try { pl = JSON.parse(simStore().getItem('practice_plan')); } catch (e) {}
    var planSig = pl ? pl.sig : null;
    var mine = practiceTopic ? campaigns.filter(function (c) { return c.category === practiceTopic && (c.status === 'active' || c.runSig === planSig); }) : campaigns;
    var pOrders = []; try { pOrders = JSON.parse(simStore().getItem('practice_orders')) || []; } catch (e) {}
    var adSpend = adSpendLive(pOrders, mine);   // CAC × 광고 유입 주문 수 (저장된 spend 무시)
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
      simStore().removeItem(k);
    });
    render();   // 손익 요약 갱신 (광고 캠페인은 유지)
  }

  /* ---------- 캠페인 표 ---------- */
  function shown() {
    var list = campaigns;
    if (tab === 'active') list = list.filter(function (c) { return c.status === 'active'; });
    else if (tab === 'completed') list = list.filter(function (c) { return c.status === 'completed'; });
    if (onlySelected) list = list.filter(function (c) { return selectedIds[c.id]; });
    return list;
  }

  function render() {
    var list = shown();
    var body = document.getElementById('advBody');

    if (!list.length) {
      body.innerHTML = '<tr><td colspan="15" style="text-align:center;color:var(--muted);padding:48px;">' +
        (!campaigns.length
          ? '아직 캠페인이 없습니다. 우측 상단 <b>[Create campaign]</b> 으로 광고 캠페인을 만들어보세요.'
          : (onlySelected && !selCount())
            ? '선택한 광고가 없습니다. 왼쪽 <b>체크박스</b>로 볼 광고를 골라주세요.'
            : '이 조건에 맞는 캠페인이 없습니다.') +
        '</td></tr>';
    } else {
      var ctx = runContext();
      var liveMap = {};
      ctx.mine.forEach(function (c) { liveMap[c.name] = campaignLive(c, ctx.orders, ctx.names); });
      body.innerHTML = list.map(function (c) {
        var lv = liveMap[c.name];        // 이번 연습 캠페인이면 실시간 성과
        var v = lv || c;                 // 아니면 저장된 값
        var pending = !!lv && lv.customers === 0;   // 이번 런인데 아직 광고 유입 주문 없음
        return '<tr data-id="' + c.id + '" class="adv-row" title="클릭하면 이 캠페인을 수정합니다">' +
          '<td class="adv-check"><input type="checkbox" class="advSel" data-id="' + c.id + '"' + (selectedIds[c.id] ? ' checked' : '') + '></td>' +
          '<td class="ord-cust" style="color:var(--primary);">' + esc(c.name) +
            (c.resolved ? ' <span class="adv-fixed" title="잘 조정됨">✓</span>' : '') +
          '</td>' +
          '<td>' + (c.alert ? '<span class="risk-badge med">⚠ ' + esc(c.alert) + '</span>' : '') + '</td>' +
          '<td>' + (c.status === 'active'
            ? '<span class="adv-status on">Active</span>' + (pending ? ' <span style="font-size:0.72rem;color:var(--muted);">집계 전</span>' : '')
            : '<span class="adv-status">Completed</span>') + '</td>' +
          '<td>' + esc(c.segment) + '</td>' +
          '<td class="r">' + (pending ? '—' : money(v.sales)) + '</td>' +
          '<td class="r">' + (pending ? '—' : money(v.cac)) + '</td>' +
          '<td class="r">' + (pending ? '—' : (Number(v.roas) || 0).toFixed(2)) + '</td>' +
          '<td class="r">' + (pending ? '—' : v.customers) + '</td>' +
          '<td class="r">' + (pending ? '—' : money(v.aov)) + '</td>' +
          '<td class="r">' + (pending ? '—' : money(v.spend)) + '</td>' +
          '<td>' + esc(c.country) + '</td>' +
          '<td>' + fmtDate(c.start) + '</td>' +
          '<td>' + (c.end ? fmtDate(c.end) : '') + '</td>' +
          '<td class="adv-rowact" style="white-space:nowrap;">' +
            '<button class="btn-sm" data-edit="' + c.id + '">' + (c.demoCase ? '문제 풀기' : '수정') + '</button>' +
            (c.demoCase ? '' : ' <button class="btn-sm is-danger" data-del="' + c.id + '">삭제</button>') +
          '</td>' +
        '</tr>';
      }).join('');
    }

    document.getElementById('advCount').textContent = campaigns.length
      ? campaigns.length + '개 캠페인' : '';
    document.getElementById('advUpdated').textContent = campaigns.length
      ? 'Last updated ' + new Date().toLocaleDateString() : '';
    renderMetrics();
    renderSummary();
    updateSelUI();
  }

  // 선택 개수/버튼/전체선택 체크 상태 동기화
  function updateSelUI() {
    var n = selCount();
    var btn = document.getElementById('advOnlySel');
    btn.textContent = n ? '선택만 보기 (' + n + ')' : '선택만 보기';
    btn.classList.toggle('is-on', onlySelected);
    var boxes = document.querySelectorAll('#advBody .advSel');
    var all = document.getElementById('advSelAll');
    if (all) all.checked = boxes.length > 0 && Array.prototype.every.call(boxes, function (c) { return c.checked; });
  }

  /* ---------- 캠페인 만들기 → 별도 화면 ---------- */
  function openCreate() { location.href = 'ad-campaign.html'; }

  /* ---------- 이벤트 ---------- */
  document.getElementById('createBtn').addEventListener('click', openCreate);
  document.getElementById('glossaryBtn').addEventListener('click', function () {
    window.open('ad-glossary.html', 'adGlossary',
      'width=980,height=840,menubar=no,toolbar=no,location=no,scrollbars=yes,resizable=yes');
  });

  /* ---------- 정답보기 (데모 계정 전용) — 별도 창에서 비밀번호 입력 후 정답·해설 ---------- */
  document.getElementById('answerBtn').addEventListener('click', function () {
    window.open('ad-answers.html', 'adAnswers',
      'width=720,height=840,menubar=no,toolbar=no,location=no,scrollbars=yes,resizable=yes');
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

  // 상단 지표 기간: 드롭다운에서 선택 (1 day / 7 days / 30 days)
  var rangeEl = document.getElementById('advRange');
  rangeEl.value = metricRange;
  rangeEl.addEventListener('change', function () {
    metricRange = this.value;
    renderMetrics();
  });

  document.getElementById('advBody').addEventListener('click', function (e) {
    if (e.target.closest('.adv-check')) return;   // 체크박스 칸: 선택용 (이동/편집 아님)
    var del = e.target.closest('button[data-del]');
    if (del) {
      var id = Number(del.dataset.del);
      var c = campaigns.find(function (x) { return x.id === id; });
      if (!c) return;
      if (!confirm('정말로 삭제하시겠습니까?\n\n캠페인 "' + c.name + '"')) return;
      campaigns = campaigns.filter(function (x) { return x.id !== id; });
      save();
      render();
      return;
    }
    // 수정 버튼 또는 행 아무 곳이나 클릭 → 캠페인 수정 화면
    var edit = e.target.closest('button[data-edit]');
    if (edit) { location.href = 'ad-campaign.html?edit=' + edit.dataset.edit; return; }
    var tr = e.target.closest('tr[data-id]');
    if (tr) location.href = 'ad-campaign.html?edit=' + tr.dataset.id;
  });

  // 행 체크박스 → 선택 목록 갱신 (상단 지표도 선택 기준으로 갱신)
  document.getElementById('advBody').addEventListener('change', function (e) {
    if (!e.target.classList.contains('advSel')) return;
    var id = Number(e.target.dataset.id);
    if (e.target.checked) selectedIds[id] = true; else delete selectedIds[id];
    if (onlySelected) render();   // 선택만 보기 중이면 해제한 행이 바로 사라지도록
    else { updateSelUI(); renderMetrics(); }
  });

  // 전체 선택 (현재 표에 보이는 행 대상)
  document.getElementById('advSelAll').addEventListener('change', function () {
    var on = this.checked;
    document.querySelectorAll('#advBody .advSel').forEach(function (c) {
      c.checked = on; var id = Number(c.dataset.id);
      if (on) selectedIds[id] = true; else delete selectedIds[id];
    });
    if (onlySelected) render();
    else { updateSelUI(); renderMetrics(); }
  });

  // 선택만 보기 토글
  document.getElementById('advOnlySel').addEventListener('click', function () {
    onlySelected = !onlySelected;
    render();
  });

  (async function init() {
    var user = await Auth.require();
    if (!user) return;
    var me = await Auth.me();                       // 데모 계정이면 sessionStorage 사용
    window.__demoSim = !!(me && me.is_demo);
    if (window.__demoSim) document.getElementById('answerBtn').hidden = false;   // 정답보기: 데모 계정만
    try {
      var s = await sb.from('practice_settings').select('topic').eq('user_id', user.id).maybeSingle();
      practiceTopic = (s.data && s.data.topic) || '';
    } catch (e) {}
    load();
    seedDemoCases();     // 데모 계정이면 진단 케이스 3개 심기
    render();
  })();
})();
