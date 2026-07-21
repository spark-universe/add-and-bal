/* =========================================================
   발주 연습 정산 (최종 이익)
   - 모든 주문을 받고 전부 처리(발주 or 환불)했을 때의 최종 손익을 계산
   - 손익 모델:
     · 정상 발주:  +(판매가 total − 원가 cost)   (역마진이면 음수)
     · 차지백 발주: −(원가 + 차지백 수수료)        (판매대금은 회수되어 0)
     · 환불/취소:  0
   ========================================================= */
(function () {
  var ORDERS = 'practice_orders';
  var PLAN = 'practice_plan';
  var CB_FEE = 15;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function money(n) {
    var v = Number(n || 0);
    return (v < 0 ? '-$' : '$') + Math.abs(v).toFixed(2);
  }
  function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }

  function grade(pct, cbCount) {
    if (pct >= 90 && cbCount === 0) return { g: 'S', c: 'g-s', m: '완벽에 가까워요! 사기 주문을 걸러내고 이익을 극대화했습니다.' };
    if (pct >= 80) return { g: 'A', c: 'g-a', m: '훌륭합니다. 대부분의 판단이 정확했어요.' };
    if (pct >= 60) return { g: 'B', c: 'g-b', m: '괜찮아요. 몇 건의 판단만 더 다듬으면 됩니다.' };
    if (pct >= 40) return { g: 'C', c: 'g-c', m: '아쉬워요. 사기·역마진 주문을 더 걸러내야 합니다.' };
    return { g: 'D', c: 'g-d', m: '손실이 큽니다. 차지백 대응 가이드와 위험 신호를 다시 확인하세요.' };
  }

  function settle(orders) {
    var r = {
      total: orders.length,
      sales: 0, costSum: 0, saleProfit: 0, saleCount: 0,
      cbCount: 0, cbLoss: 0, cbList: [],
      cbWonCount: 0, cbWonProfit: 0,
      negCount: 0, negLoss: 0,
      refundGood: 0, refundBadCount: 0, refundBadMissed: 0,
      riskyCount: 0,
      optimal: 0, net: 0
    };
    orders.forEach(function (o) {
      var cost = Number(o.cost || 0), tot = Number(o.total || 0), margin = tot - cost;
      var isProblem = !!o.issue;                 // 걸러야 하는 주문(사기/품절/배송불가/정보누락)
      if (!isProblem && margin > 0) r.optimal += margin;   // 최선(이론) 이익

      var isCb = o.chargebackFired || o.issue === 'chargeback';
      if (o.fulfillment === 'fulfilled') {
        if (isCb) {
          if (o.chargeback && o.chargeback.status === 'won') {
            r.cbWonCount++; r.cbWonProfit += margin; r.net += margin;   // 항소 승소 → 판매 유지(운 좋음)
          } else {
            var loss = (o.chargeback && o.chargeback.loss) || (cost + CB_FEE);
            r.cbCount++; r.cbLoss += loss; r.net -= loss;
            r.cbList.push({ no: o.no, cust: o.cust, loss: loss });
          }
        } else {
          r.saleCount++; r.sales += tot; r.costSum += cost; r.saleProfit += margin; r.net += margin;
          if (margin < 0) { r.negCount++; r.negLoss += (-margin); }
          if (isProblem) r.riskyCount++;         // 사기는 아니지만 문제(품절/배송불가/정보누락) 발주
        }
      } else if (o.payment === 'refunded') {
        if (isProblem) r.refundGood++;
        else { r.refundBadCount++; if (margin > 0) r.refundBadMissed += margin; }
      }
    });
    r.cbFired = r.cbCount + r.cbWonCount;                 // 사기 주문을 발주해버린 총 건수
    // 달성률 = 순이익 ÷ 이론상 최선 이익. 운(항소 승소)·위험 처리로 최선을 넘길 수 있어 100%로 상한.
    r.achieve = r.optimal > 0 ? Math.min(100, Math.round(r.net / r.optimal * 100)) : (r.net >= 0 ? 100 : 0);
    return r;
  }

  function render(root, r, meta) {
    var g = grade(r.achieve, r.cbFired);
    var netCls = r.net >= 0 ? 'is-pos' : 'is-neg';

    var notes = [];
    notes.push(r.cbFired
      ? '<li class="bad">💸 사기(차지백) 주문 발주 <b>' + r.cbFired + '건</b>' +
          (r.cbCount ? ' · 패소 ' + r.cbCount + '건 손실 <b>' + money(-r.cbLoss) + '</b>' : '') +
          (r.cbWonCount ? ' · 승소 ' + r.cbWonCount + '건(운 좋게 방어)' : '') + '</li>'
      : '<li class="good">✅ 사기(차지백) 주문을 <b>모두 걸러냈습니다</b></li>');
    if (r.cbWonCount) notes.push('<li class="warn">🎲 항소 승소는 <b>운</b>입니다 — 최종 판단은 카드사·은행이라 대개 패소(승소율 약 30%). 사기 주문은 애초에 받지 않는 게 안전합니다.</li>');
    if (r.negCount) notes.push('<li class="bad">📉 역마진 주문 발주 <b>' + r.negCount + '건</b> · 손실 <b>' + money(-r.negLoss) + '</b></li>');
    if (r.riskyCount) notes.push('<li class="warn">⚠️ 품절·배송불가·정보누락 주문 발주 <b>' + r.riskyCount + '건</b> (배송/환불 분쟁 위험)</li>');
    if (r.refundBadCount) notes.push('<li class="warn">↩️ 정상 주문을 환불 <b>' + r.refundBadCount + '건</b> · 놓친 이익 <b>' + money(-r.refundBadMissed) + '</b></li>');
    if (r.refundGood) notes.push('<li class="good">🛡️ 문제 주문을 올바르게 환불(취소) <b>' + r.refundGood + '건</b></li>');

    var cbRows = r.cbList.length
      ? '<div class="panel" style="margin-top:18px;"><div class="panel__head"><span>차지백 발생 주문</span></div>' +
        '<div style="padding:12px 20px;">' + r.cbList.map(function (c) {
          return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:0.9rem;">' +
            '<a href="order-detail.html?no=' + encodeURIComponent(c.no) + '" style="color:var(--primary);">' + esc(c.no) + ' · ' + esc(c.cust) + '</a>' +
            '<b style="color:#c0272d;">' + money(-c.loss) + '</b></div>';
        }).join('') + '</div></div>'
      : '';

    root.innerHTML =
      '<div class="page-head">' +
        '<h2>📊 정산 결과</h2>' +
        '<p>' + esc(meta) + '</p>' +
      '</div>' +

      '<div class="result-top">' +
        '<div class="result-net ' + netCls + '">' +
          '<div class="l">최종 순이익</div>' +
          '<div class="v">' + money(r.net) + '</div>' +
        '</div>' +
        '<div class="grade-badge ' + g.c + '">' +
          '<div class="g">' + g.g + '</div>' +
          '<div class="d">달성률 ' + r.achieve + '%</div>' +
        '</div>' +
      '</div>' +
      '<p class="result-comment">' + g.m + '</p>' +
      '<p class="result-basis">📐 <b>달성률</b> = 최종 순이익 ÷ <b>이론상 최선 이익</b>(정상이면서 이익 나는 주문만 발주하고, 사기·역마진·문제 주문은 모두 거절했을 때). 최대 100%.</p>' +

      '<div class="stat-row">' +
        '<div class="stat"><div class="label">총 주문</div><div class="value">' + r.total + '<span style="font-size:0.9rem;font-weight:600;">건</span></div></div>' +
        '<div class="stat"><div class="label">정상 발주</div><div class="value">' + r.saleCount + '<span style="font-size:0.9rem;font-weight:600;">건</span></div></div>' +
        '<div class="stat"><div class="label">판매 이익</div><div class="value" style="font-size:1.3rem;color:var(--ok);">' + money(r.saleProfit) + '</div></div>' +
        '<div class="stat"><div class="label">차지백 손실</div><div class="value" style="font-size:1.3rem;color:#c0272d;">' + money(-r.cbLoss) + '</div></div>' +
      '</div>' +

      '<div class="panel">' +
        '<div class="panel__head"><span>손익 상세</span></div>' +
        '<table class="breakdown">' +
          '<tr><td>매출 (정상 판매 ' + r.saleCount + '건)</td><td class="r">' + money(r.sales) + '</td></tr>' +
          '<tr><td>상품 원가</td><td class="r">' + money(-r.costSum) + '</td></tr>' +
          '<tr class="sub"><td>판매 이익' + (r.negCount ? ' <span style="color:#c0272d;font-weight:600;">(역마진 ' + r.negCount + '건 포함)</span>' : '') + '</td><td class="r">' + money(r.saleProfit) + '</td></tr>' +
          (r.cbWonCount ? '<tr><td>차지백 방어 성공 (' + r.cbWonCount + '건)</td><td class="r is-pos">' + money(r.cbWonProfit) + '</td></tr>' : '') +
          '<tr><td>차지백 손실 (' + r.cbCount + '건)</td><td class="r">' + money(-r.cbLoss) + '</td></tr>' +
          '<tr class="total"><td>최종 순이익</td><td class="r ' + netCls + '">' + money(r.net) + '</td></tr>' +
        '</table>' +
      '</div>' +

      '<div class="panel" style="margin-top:18px;">' +
        '<div class="panel__head"><span>처리 요약 & 실수</span></div>' +
        '<ul class="result-notes">' + notes.join('') + '</ul>' +
      '</div>' +

      cbRows +

      '<div style="display:flex;gap:10px;margin-top:22px;flex-wrap:wrap;">' +
        '<a class="btn-primary" href="order-setup.html" style="text-decoration:none;">🔄 새 세팅으로 다시 하기</a>' +
        '<a class="btn-sm" href="order-practice.html" style="text-decoration:none;">발주 연습으로</a>' +
        '<a class="btn-sm" href="chargeback-manual.html" target="_blank" rel="noopener" style="text-decoration:none;">📕 차지백 대응 가이드</a>' +
      '</div>';
  }

  function notReady(root, msg) {
    root.innerHTML =
      '<div class="page-head"><h2>📊 정산 결과</h2></div>' +
      '<div class="panel"><div style="padding:40px 24px;text-align:center;color:var(--muted);">' + msg +
      '<br><br><a class="btn-primary" href="order-practice.html" style="text-decoration:none;padding:9px 16px;">발주 연습으로 돌아가기</a>' +
      '</div></div>';
  }

  (async function init() {
    var user = await Auth.require();
    if (!user) return;
    var root = document.getElementById('resultRoot');

    var orders = load(ORDERS) || [];
    var plan = load(PLAN);
    var total = plan ? plan.total : orders.length;

    if (!orders.length || !total) {
      notReady(root, '아직 발주 연습을 시작하지 않았습니다.');
      return;
    }
    var received = orders.length;
    var processed = orders.filter(function (o) { return o.fulfillment !== 'unfulfilled'; }).length;
    if (received < total || processed < received) {
      notReady(root, '아직 모든 주문을 처리하지 않았습니다. <b>' + processed + ' / ' + total + '건</b> 완료.<br>남은 주문을 모두 받아 발주하거나 환불한 뒤 정산할 수 있습니다.');
      return;
    }

    // 세팅 정보(주제·난이도·마진) — 표시용
    var meta = '';
    try {
      var s = await sb.from('practice_settings').select('topic, level, margin').eq('user_id', user.id).maybeSingle();
      if (s.data) meta = [s.data.topic, '난이도 ' + (s.data.level || '-'), '마진 ' + s.data.margin + '%'].join(' · ');
    } catch (e) {}

    render(root, settle(orders), meta);
  })();
})();
