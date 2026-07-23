/* =========================================================
   주문 상세 (쇼피파이 주문 상세 화면 재현)
   - order-practice.html 의 주문 행을 클릭하면 ?no=#1150 으로 들어옴
   - 데이터는 localStorage('practice_orders') 에 저장된 주문 그대로 사용
   - 이 화면은 '판단의 재료'를 보여주는 곳:
     상품/금액/배송지·청구지/연락처/Order risk/타임라인 을 보고
     발주할지, 사기라서 거를지, 고객에게 문의할지를 결정하게 된다
   - TODO: [Mark as fulfilled] 등 실제 처리 동작 → 정산·성적 (다음 단계)
   ========================================================= */
(function () {
  var ORDERS = 'practice_orders';

  var MONTHS = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];

  var current = null;   // 지금 보고 있는 주문

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function money(n) { return '$' + Number(n || 0).toFixed(2); }

  // 결정적 옵션/품절 (js/amazon.js 의 동일 함수와 반드시 로직 일치!)
  function h(s) { var n = 0; s = String(s); for (var i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) >>> 0; return n; }
  function lineOos(l) { return !!l.oos; }
  function oosInfo(o) {
    var l = (o.lines || []).find(function (x) { return x.oos; });
    if (!l) return null;
    var t = l.oosType || 'stock';
    var reason = t === 'notfound' ? '단종 — 아마존에서 검색해도 나오지 않습니다'
      : t === 'option' ? '요청 옵션(' + (l.reqOption ? l.reqOption.label + ' ' + l.reqOption.value : '') + ')이 아마존에 없습니다'
      : '품절 — 아마존 재고 없음';
    return { line: l, type: t, reason: reason };
  }
  function optionOf(no, line, level) {
    if (line.oos) return null;
    var seed = h(no + line.pid + 'opt');
    var pth = level === '상' ? 6 : level === '하' ? 2 : 4;   // 하 20% / 중 40% / 상 60%
    if (seed % 10 >= pth) return null;
    var TYPES = [
      { label: '색상', choices: ['블랙', '화이트', '블루', '레드', '그린'] },
      { label: '사이즈', choices: ['S', 'M', 'L', 'XL'] },
      { label: '용량', choices: ['소형', '중형', '대형'] }
    ];
    var t = TYPES[seed % TYPES.length];
    return { label: t.label, choices: t.choices, correct: t.choices[Math.floor(seed / 7) % t.choices.length] };
  }

  function fmtFull(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    var h = d.getHours(), ampm = h >= 12 ? 'pm' : 'am', h12 = h % 12 || 12;
    var mm = String(d.getMinutes()).padStart(2, '0');
    return MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear() +
      ' at ' + h12 + ':' + mm + ' ' + ampm;
  }
  function fmtTime(ts, minusMin) {
    var d = new Date(ts - (minusMin || 0) * 60000);
    var h = d.getHours(), ampm = h >= 12 ? 'PM' : 'AM', h12 = h % 12 || 12;
    return h12 + ':' + String(d.getMinutes()).padStart(2, '0') + ' ' + ampm;
  }
  function fmtDay(ts) {
    var d = new Date(ts);
    return MONTHS[d.getMonth()].slice(0, 3) === 'Jun' ? 'June ' + d.getDate()
      : MONTHS[d.getMonth()] + ' ' + d.getDate();
  }
  function ordinal(n) {
    if (n === 1) return '1st';
    if (n === 2) return '2nd';
    if (n === 3) return '3rd';
    return n + 'th';
  }

  function load() {
    var no = new URLSearchParams(location.search).get('no');
    var orders = [];
    try { orders = JSON.parse(localStorage.getItem(ORDERS)) || []; } catch (e) { orders = []; }
    return orders.find(function (o) { return o.no === no; });
  }

  // 바뀐 주문을 목록에 되돌려 저장
  function saveOrder(o) {
    var orders = [];
    try { orders = JSON.parse(localStorage.getItem(ORDERS)) || []; } catch (e) { return; }
    var i = orders.findIndex(function (x) { return x.no === o.no; });
    if (i !== -1) orders[i] = o;
    localStorage.setItem(ORDERS, JSON.stringify(orders));
  }

  /* ===== 차지백(Chargeback) 이벤트 =====
     사기(도난 카드) 주문(issue==='chargeback')을 걸러내지 못하고 발주(fulfilled)하면
     차지백이 '열린다(open)'. 판매자는 마감일까지 증거를 제출해 항소하거나 수용할 수 있으나,
     사기 주문은 항상 패소 → 판매대금 회수 + 수수료 + 이미 지출한 원가만큼 순손실.
     (order-chargeback.html 이 항소 화면. resolveChargeback 은 두 파일이 같은 규칙 사용) */
  var CB_FEE = 15;                 // 차지백 수수료 (USD)
  var CB_DAYS = 15;                // 증거 제출 마감(일)

  function cbAmounts(o) {
    var cost = Number(o.cost || 0);
    var amount = Number(o.grandTotal || o.total || 0);   // 분쟁 금액(고객 결제액)
    return { cost: cost, amount: amount, fee: CB_FEE, total: amount + CB_FEE, loss: cost + CB_FEE };
  }

  function logChargeback(o) {
    try {
      var cb = o.chargeback || {};
      var log = JSON.parse(localStorage.getItem('practice_chargebacks')) || [];
      var rec = { no: o.no, amount: cb.amount, fee: cb.fee, loss: cb.loss,
        status: cb.status, resolution: cb.resolution, at: cb.openedAt };
      var i = log.findIndex(function (x) { return x.no === o.no; });
      if (i === -1) log.push(rec); else log[i] = rec;
      localStorage.setItem('practice_chargebacks', JSON.stringify(log));
    } catch (e) {}
  }

  function fireChargebackIfNeeded(o) {
    if (!o || o.fulfillment !== 'fulfilled') return;
    if (o.chargebackFired) return;                 // 이미 발생한 주문은 다시 뜨지 않음

    // 차지백이 열리는 두 경우:
    //  (1) 사기(도난 카드) 주문을 걸러내지 못하고 발주한 경우
    //  (2) 주문과 다른 상품/옵션을 잘못 보낸 경우(오배송) → 무조건 차지백
    var isFraud = o.issue === 'chargeback';
    var isMisship = !!(o.amazon && o.amazon.misship);
    if (!isFraud && !isMisship) return;

    var a = cbAmounts(o);
    var now = Date.now();
    o.chargebackFired = true;
    o.chargeback = {
      status: 'open',
      kind: isFraud ? 'fraud' : 'wrongitem',
      reason: isFraud ? 'Product not received' : 'Item not as described',
      amount: a.amount, fee: a.fee, total: a.total, loss: a.loss,
      openedAt: now, deadline: now + CB_DAYS * 86400000,
      resolvedAt: null, resolution: null
    };
    saveOrder(o);
    logChargeback(o);
    showChargeback(o);
  }

  // 차지백 확정 (수용 or 항소 패소). 사기 주문이라 결과는 항상 손실 확정.
  function resolveChargeback(o, resolution) {
    if (!o.chargeback || o.chargeback.status !== 'open') return;
    o.chargeback.status = 'lost';
    o.chargeback.resolution = resolution;          // 'accepted' | 'disputed_lost'
    o.chargeback.resolvedAt = Date.now();
    saveOrder(o);
    logChargeback(o);
  }

  // 발주 직후 뜨는 안내 팝업 (항소 페이지로 안내)
  function showChargeback(o) {
    var cb = o.chargeback;
    var box = document.createElement('div');
    box.className = 'modal-overlay is-open';
    box.innerHTML =
      '<div class="modal-card cb-card">' +
        '<div class="cb-head">' +
          '<div class="cb-emoji">⚠️</div>' +
          '<h3>차지백이 열렸습니다 (Chargeback opened)</h3>' +
        '</div>' +
        '<div class="modal-card__body">' +
          (cb.kind === 'wrongitem'
            ? '<p class="cb-lead"><b>' + esc(o.no) + '</b> 주문은 <b>주문과 다른 상품/옵션을 발송</b>했습니다.<br>' +
                '고객이 받은 상품이 주문과 달라 카드사에 결제를 취소(차지백)했습니다.</p>' +
              '<div class="cb-signals">🚩 원인: 아마존에서 유사품·잘못된 옵션·엉뚱한 상품을 담아 발주</div>'
            : '<p class="cb-lead"><b>' + esc(o.no) + '</b> 주문은 <b>사기(도난 카드) 주문</b>이었습니다.<br>' +
                '발주해서 상품을 보낸 뒤, 고객이 카드사에 결제를 취소(차지백)했습니다.</p>' +
              '<div class="cb-signals">🚩 위험 신호: 청구자·수령자 이름 불일치' +
                (o.risk === 'high' ? ' · 높은 위험도(High risk)' : '') + ' · 특급배송(Express) 요청</div>') +
          '<table class="cb-money">' +
            '<tr><td>분쟁 금액 (Dispute amount)</td><td class="r">' + money(cb.amount) + '</td></tr>' +
            '<tr><td>차지백 수수료 (Fee)</td><td class="r">' + money(cb.fee) + '</td></tr>' +
            '<tr class="cb-total"><td>차지백 총액 (Total)</td><td class="r">' + money(cb.total) + '</td></tr>' +
          '</table>' +
          '<div class="cb-tip">📄 마감일까지 <b>증거를 제출해 항소</b>하거나 <b>차지백을 수용</b>할 수 있습니다. ' +
            '다만 <b>최종 판단은 카드사·은행</b>이 하고 대개 고객 편을 들어 <b>승소율은 약 30%뿐</b>입니다. ' +
            (cb.kind === 'wrongitem'
              ? '이런 손실은 원래 아마존에서 <b>정확한 상품·옵션을 담아 발주</b>했으면 없었습니다.<br>'
              : '이런 주문은 원래 <b>[환불하기(주문 취소)]</b>로 걸렀어야 합니다.<br>') +
            '실제 대응 방법은 <a href="chargeback-manual.html" target="_blank" rel="noopener" style="color:var(--primary);">📕 차지백 대응 가이드</a>를 참고하세요.</div>' +
        '</div>' +
        '<div class="modal-card__foot">' +
          '<button class="btn-sm" data-close>나중에</button>' +
          '<button class="btn-sm is-dark" id="cbGoResp">증거 제출 / 항소하기</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(box);
    box.addEventListener('click', function (ev) {
      if (ev.target === box || ev.target.closest('[data-close]')) { box.remove(); render(o); }
    });
    box.querySelector('#cbGoResp').addEventListener('click', function () {
      location.href = 'order-chargeback.html?no=' + encodeURIComponent(o.no);
    });
  }

  // 상세 화면 상단 차지백 배너
  function cbBanner(o) {
    var cb = o.chargeback;
    if (!cb) return '';
    if (cb.status === 'open') {
      return '<div class="cb-alert">' +
          '<div class="cb-alert__title">⚠️ Chargeback opened for ' + money(cb.total) + '</div>' +
          '<div class="cb-alert__desc">' + fmtFull(cb.deadline) + '까지 증거를 제출해 항소할 수 있습니다. ' +
            '이후 자동 제출됩니다. <b>최종 판단은 카드사·은행이 하며, 대개 고객 편을 들어 승소율은 약 30%뿐입니다.</b></div>' +
          '<div class="cb-alert__btns">' +
            '<button class="btn-sm is-dark" id="cbEvidence">증거 제출하기 (항소)</button>' +
            '<button class="btn-sm" id="cbAccept">차지백 수용</button>' +
            '<a class="btn-sm" href="chargeback-manual.html" target="_blank" rel="noopener" style="text-decoration:none;">📕 대응 가이드</a>' +
          '</div>' +
        '</div>';
    }
    if (cb.status === 'won') {
      return '<div class="cb-alert is-won">' +
          '<div class="cb-alert__title">🎉 차지백 방어 성공 (항소 승소) · 판매대금 유지</div>' +
          '<div class="cb-alert__desc">이번엔 운 좋게 방어했지만, 최종 판단은 카드사·은행이라 사기 차지백은 대부분 패소합니다. ' +
            '이런 주문은 애초에 받지 않는 것이 안전합니다. ' +
            '<a href="chargeback-manual.html" target="_blank" rel="noopener" style="color:var(--primary);">📕 차지백 대응 가이드</a></div>' +
        '</div>';
    }
    var res = cb.resolution === 'accepted' ? '차지백 수용' : '항소 패소';
    return '<div class="cb-alert is-lost">' +
        '<div class="cb-alert__title">💸 차지백 확정 (' + res + ') · 순 손실 -' + money(cb.loss) + '</div>' +
        '<div class="cb-alert__desc">판매대금 ' + money(cb.amount) + ' 회수 + 수수료 ' + money(cb.fee) +
          '. 이미 지출한 상품 원가도 회수할 수 없습니다. ' +
          '<a href="chargeback-manual.html" target="_blank" rel="noopener" style="color:var(--primary);">📕 차지백 대응 가이드</a></div>' +
      '</div>';
  }

  /* ===== 미배송 클레임 차지백 (Product not received) =====
     안내 없이 취소(환불)한 주문에서 고객이 "제품 안 왔다"며 차지백을 건다.
     - 타임라인: 차지백 접수 '전' 취소 → 항소 시 승소 / 접수 '후' 취소 → 확률 싸움(최대 50%)
     - 고객과 소통 → 취하 유도 + 승률↑ / 자료 제출 → 승률↑ */
  function dayStr(ts) { return ts ? fmtFull(ts).split(' at ')[0] : '-'; }

  function nrcbBanner(o) {
    var cb = o.nrcb;
    if (!cb) return '';
    if (cb.status === 'open') {
      return '<div class="cb-alert">' +
          '<div class="cb-alert__title">⚠️ 미배송 클레임 차지백 — 고객: “주문한 제품이 안 왔어요” (' + money(cb.loss) + ')</div>' +
          '<div class="cb-alert__desc">🗓 환불 처리: <b>' + dayStr(o.refundedAt) + '</b> · 차지백 접수: <b>' + dayStr(cb.filedAt) + '</b>' +
            (cb.contacted ? ' · ✅ 고객 소통함' : '') + '<br>' +
            '고객과 소통해 <b>취하</b>를 유도하거나, <b>증거를 제출해 항소</b>하세요. 소통·자료·타임라인에 따라 승률이 달라집니다.</div>' +
          '<div class="cb-alert__btns">' +
            '<button class="btn-sm is-dark" id="nrContact">📧 고객과 소통</button>' +
            '<button class="btn-sm" id="nrDispute">📄 증거 제출·항소</button>' +
            '<button class="btn-sm" id="nrAccept">차지백 수용</button>' +
          '</div>' +
        '</div>';
    }
    if (cb.status === 'won') {
      return '<div class="cb-alert is-won">' +
          '<div class="cb-alert__title">🎉 미배송 차지백 방어 성공 (' + (cb.resolution === 'withdrawn' ? '고객 취하' : '항소 승소') + ')</div>' +
          '<div class="cb-alert__desc">추가 손실 없이 마무리됐습니다. 취소 시 <b>고객 안내</b>가 이런 분쟁을 막아줍니다.</div>' +
        '</div>';
    }
    return '<div class="cb-alert is-lost">' +
        '<div class="cb-alert__title">💸 미배송 차지백 확정 (' + (cb.resolution === 'accepted' ? '수용' : '항소 패소') + ') · 손실 -' + money(cb.loss) + '</div>' +
        '<div class="cb-alert__desc">이미 환불한 금액에 더해 판매대금이 재차 회수되고 수수료가 부과됐습니다. ' +
          '<b>취소할 때 고객에게 안내 메일만 보냈어도</b> 예방할 수 있었습니다.</div>' +
      '</div>';
  }

  function resolveNrCb(o, status, resolution) {
    if (!o.nrcb || o.nrcb.status !== 'open') return;
    o.nrcb.status = status; o.nrcb.resolution = resolution; o.nrcb.resolvedAt = Date.now();
    saveOrder(o);
  }

  function openNrContact(o) {
    var cb = o.nrcb;
    var box = document.createElement('div');
    box.className = 'modal-overlay is-open';
    box.innerHTML =
      '<div class="modal-card" style="max-width:520px;">' +
        '<div class="modal-card__head"><h3>고객과 소통 (해명 메일)</h3><button class="modal-close" data-close>×</button></div>' +
        '<div class="modal-card__body">' +
          '<div class="cust-mail"><div class="cust-mail__body">Hi ' + esc(o.cust) + ',<br><br>' +
            'We are sorry for the confusion. Your order <b>' + esc(o.no) + '</b> was cancelled and <b>fully refunded</b> on ' + dayStr(o.refundedAt) + '. ' +
            'Please check your statement — you should see the refund. We kindly ask you to withdraw the chargeback.<br><br>' +
            '<span class="od-muted">(주문은 취소·전액 환불되었음을 안내하고, 차지백 취하를 정중히 요청합니다.)</span></div></div>' +
        '</div>' +
        '<div class="modal-card__foot"><button class="btn-sm" data-close>취소</button>' +
          '<button class="btn-sm is-dark" id="nrSend">📧 메일 보내기</button></div>' +
      '</div>';
    document.body.appendChild(box);
    box.addEventListener('click', function (ev) { if (ev.target === box || ev.target.closest('[data-close]')) box.remove(); });
    box.querySelector('#nrSend').addEventListener('click', function () {
      cb.contacted = true; saveOrder(o); box.remove();
      var prob = cb.cancelBeforeFile ? 0.7 : 0.45;           // 소통 시 고객이 취하할 확률
      if (Math.random() < prob) { resolveNrCb(o, 'won', 'withdrawn'); render(o); showNrResult(o, 'withdrawn'); }
      else { render(o); showNrInfo(); }
    });
  }

  function showNrInfo() {
    var box = document.createElement('div');
    box.className = 'modal-overlay is-open';
    box.innerHTML = '<div class="modal-card" style="max-width:420px;">' +
      '<div class="modal-card__body" style="padding:26px 24px;text-align:center;">' +
        '<div style="font-size:2rem;">📭</div><p style="margin:10px 0 0;font-size:0.92rem;line-height:1.6;">' +
        '고객이 아직 답이 없습니다.<br><b>증거를 제출해 항소</b>하세요. (소통 기록이 승률을 높여줍니다)</p></div>' +
      '<div class="modal-card__foot"><button class="btn-sm is-dark" data-close>확인</button></div></div>';
    document.body.appendChild(box);
    box.addEventListener('click', function (ev) { if (ev.target === box || ev.target.closest('[data-close]')) box.remove(); });
  }

  function openNrDispute(o) {
    var cb = o.nrcb;
    var box = document.createElement('div');
    box.className = 'modal-overlay is-open';
    box.innerHTML =
      '<div class="modal-card cb-card">' +
        '<div class="cb-head"><div class="cb-emoji">📄</div><h3>미배송 차지백 항소</h3></div>' +
        '<div class="modal-card__body">' +
          '<div class="cb-signals">🗓 환불 처리 <b>' + dayStr(o.refundedAt) + '</b> · 차지백 접수 <b>' + dayStr(cb.filedAt) + '</b>' +
            (cb.cancelBeforeFile ? ' — 취소가 접수보다 <b>빨라 유리</b>합니다' : ' — 접수 후 취소라 <b>확률 싸움</b>입니다') + '</div>' +
          '<div class="cbr-h" style="margin:12px 0 6px;font-weight:800;">제출할 증거</div>' +
          '<label class="nr-ev"><input type="checkbox" class="nrEv" checked> 환불 증빙 (타임라인)</label>' +
          '<label class="nr-ev"><input type="checkbox" class="nrEv"' + (cb.contacted ? ' checked' : '') + '> 고객 소통 기록' + (cb.contacted ? '' : ' (소통해야 확보)') + '</label>' +
          '<label class="nr-ev"><input type="checkbox" class="nrEv"> 주문·배송 세부 자료</label>' +
          '<div class="cb-tip" style="margin-top:12px;">일방적 승리는 없습니다 — <b>최대 승률 50%</b>. 소통·자료·타임라인이 승률을 좌우합니다.</div>' +
        '</div>' +
        '<div class="modal-card__foot"><button class="btn-sm" data-close>취소</button>' +
          '<button class="btn-sm is-dark" id="nrGo">Submit (항소 제출)</button></div>' +
      '</div>';
    document.body.appendChild(box);
    box.addEventListener('click', function (ev) { if (ev.target === box || ev.target.closest('[data-close]')) box.remove(); });
    box.querySelector('#nrGo').addEventListener('click', function () {
      var ev = box.querySelectorAll('.nrEv:checked').length;
      var win;
      if (cb.cancelBeforeFile) { win = Math.random() < 0.9; }   // 접수 전 취소 → 거의 승소
      else {
        var p = 0.15 + (cb.contacted ? 0.20 : 0) + (ev >= 2 ? 0.15 : 0);
        p = Math.min(0.5, p);                                   // 최대 5:5
        win = Math.random() < p;
      }
      resolveNrCb(o, win ? 'won' : 'lost', win ? 'disputed_won' : 'disputed_lost');
      box.remove(); render(o); showNrResult(o, win ? 'disputed_won' : 'disputed_lost');
    });
  }

  function showNrResult(o, resolution) {
    var cb = o.nrcb;
    var won = resolution === 'withdrawn' || resolution === 'disputed_won';
    var title = resolution === 'withdrawn' ? '고객이 차지백을 취하했습니다 🎉'
      : resolution === 'disputed_won' ? '항소 승소 🎉'
      : resolution === 'accepted' ? '차지백 수용 — 손실 확정' : '항소 패소 — 손실 확정';
    var body = won
      ? '<p class="cb-lead">추가 손실 없이 방어했습니다. 하지만 <b>취소 시 고객 안내</b>를 했다면 이 분쟁 자체가 없었을 것입니다.</p>'
      : '<p class="cb-lead">패소로 <b>이미 환불한 금액이 재차 회수</b>되고 수수료가 부과됐습니다.</p>' +
        '<table class="cb-money"><tr><td>판매대금 재회수</td><td class="r">-' + money(cb.amount) + '</td></tr>' +
        '<tr><td>차지백 수수료</td><td class="r">-' + money(cb.fee) + '</td></tr>' +
        '<tr class="cb-total"><td>손실</td><td class="r">-' + money(cb.loss) + '</td></tr></table>';
    body += '<div class="cb-tip">💡 취소·환불할 때는 항상 <b>고객에게 안내 메일</b>을 보내세요. 소통이 미배송 차지백을 예방하고 승률도 올립니다.</div>';
    var box = document.createElement('div');
    box.className = 'modal-overlay is-open';
    box.innerHTML = '<div class="modal-card cb-card"><div class="cb-head' + (won ? ' is-won' : '') + '">' +
      '<div class="cb-emoji">' + (won ? '🎉' : '💸') + '</div><h3>' + title + '</h3></div>' +
      '<div class="modal-card__body">' + body + '</div>' +
      '<div class="modal-card__foot"><button class="btn-sm is-dark" data-close>확인</button></div></div>';
    document.body.appendChild(box);
    box.addEventListener('click', function (ev) { if (ev.target === box || ev.target.closest('[data-close]')) box.remove(); });
  }

  /* ---------- 조각들 ---------- */
  function badges(o) {
    var pay = '<span class="ord-badge"><span class="dot"></span>' +
      (o.payment === 'refunded' ? 'Refunded' : 'Paid') + '</span>';
    var ful = o.fulfillment === 'fulfilled'
      ? '<span class="ord-badge"><span class="dot"></span>Fulfilled</span>'
      : '<span class="ord-badge attn"><span class="dot"></span>Unfulfilled</span>';
    var cb = '';
    if (o.chargeback) {
      var st = o.chargeback.status;
      cb = st === 'open'
        ? ' <span class="ord-badge cb-open"><span class="dot"></span>Chargeback open</span>'
        : st === 'won'
          ? ' <span class="ord-badge cb-won"><span class="dot"></span>Chargeback won</span>'
          : ' <span class="ord-badge cb-lost"><span class="dot"></span>Chargeback lost</span>';
    }
    if (o.nrcb) {
      var ns = o.nrcb.status;
      cb += ns === 'open' ? ' <span class="ord-badge cb-open"><span class="dot"></span>Not received</span>'
        : ns === 'won' ? ' <span class="ord-badge cb-won"><span class="dot"></span>Claim won</span>'
          : ' <span class="ord-badge cb-lost"><span class="dot"></span>Claim lost</span>';
    }
    return pay + ' ' + ful + cb;
  }

  function lineRows(o) {
    return (o.lines || []).map(function (l, li) {
      // 사진을 누르면 크게 볼 수 있다 (사진이 여러 장이면 넘겨볼 수 있음)
      var imgs = (l.images && l.images.length) ? l.images : (l.image ? [l.image] : []);
      var img = imgs.length
        ? '<span class="od-imgwrap is-zoom" data-line="' + li + '" title="클릭하면 크게 보기">' +
            '<img class="od-img" src="' + esc(imgs[0]) + '" alt="">' +
            (imgs.length > 1 ? '<span class="od-imgcount">' + imgs.length + '</span>' : '') +
          '</span>'
        : '<span class="od-img od-img--empty">?</span>';
      return '<div class="od-line">' +
        img +
        '<div class="od-line__info">' +
          '<a class="od-line__name" href="' + (l.source ? esc(l.source) : '#') + '"' +
            (l.source ? ' target="_blank"' : '') + '>' + esc(l.name) + '</a>' +
          '<div class="od-line__sku">' + esc(l.sku || '') + '</div>' +
          (function () {
            var op = optionOf(o.no, l, o.level);
            var label = op ? op.label : (l.reqOption ? l.reqOption.label : null);
            var val = op ? op.correct : (l.reqOption ? l.reqOption.value : null);
            return label ? '<div class="od-opt">🎨 옵션 · ' + esc(label) + ': <b>' + esc(val) + '</b></div>' : '';
          })() +
        '</div>' +
        '<div class="od-line__qty">' + money(l.price) + ' × <span class="od-qty">' + l.qty + '</span></div>' +
        '<div class="od-line__sum">' + money(l.price * l.qty) + '</div>' +
      '</div>';
    }).join('');
  }

  /* ---------- 재고 부족 안내 + 고객 문의 ----------
     아마존 재고가 주문 수량보다 적을 때 뜬다.
     [고객에게 문의하기] 를 눌러야 고객의 답장이 오고, 그 답장대로 처리해야 정답이다. */
  // 품절/단종/옵션없음은 화면에서 미리 알려주지 않는다 (학생이 아마존에서 직접 판단).
  // 발송 불가라고 판단되면 [환불하기]에서 사유를 직접 고르고 고객 메일을 보낸다.
  function stockBox(o) { return ''; }

  // 환불 시 고객에게 보내는 안내 메일(사유는 드러내지 않는 일반 문구)
  function refundEmailText(o) {
    return 'Hi ' + esc(o.cust) + ',<br><br>' +
      'Unfortunately we are unable to fulfill your order <b>' + esc(o.no) + '</b>, so we have issued you a <b>full refund</b>. ' +
      'We sincerely apologize for the inconvenience.<br><br>' +
      '<span class="od-muted">(주문하신 상품을 발송해 드릴 수 없어 전액 환불 처리했습니다. 불편을 드려 죄송합니다.)</span>';
  }

  // 품절 안내 메일 (재고 유무와 무관하게 언제든 보낼 수 있음 — 판단은 학생 몫)
  function stockAlertText(o) {
    return 'Hi ' + esc(o.cust) + ',<br><br>' +
      'We are sorry to inform you that an item in your order <b>' + esc(o.no) + '</b> is currently <b>out of stock</b> and cannot be shipped. ' +
      'We will issue you a full refund shortly. We sincerely apologize for the inconvenience.<br><br>' +
      '<span class="od-muted">(주문하신 상품이 품절되어 발송이 어렵습니다. 곧 전액 환불해 드리겠습니다. 불편을 드려 죄송합니다.)</span>';
  }

  function openStockAlert(o) {
    var box = document.createElement('div');
    box.className = 'modal-overlay is-open';
    box.innerHTML =
      '<div class="modal-card" style="max-width:520px;">' +
        '<div class="modal-card__head"><h3>고객에게 품절 안내 메일</h3><button class="modal-close" data-close>×</button></div>' +
        '<div class="modal-card__body">' +
          '<div class="cust-mail">' +
            '<div class="cust-mail__row"><span>받는 사람</span><b>' + esc(o.cust) + (o.email ? ' &lt;' + esc(o.email) + '&gt;' : '') + '</b></div>' +
            '<div class="cust-mail__row"><span>제목</span><b>Regarding your order ' + esc(o.no) + '</b></div>' +
            '<div class="cust-mail__body">' + stockAlertText(o) + '</div>' +
          '</div>' +
          '<p style="margin:12px 0 0;font-size:0.82rem;color:var(--muted);">품절·단종·옵션 없음 등 발송이 어려운 경우 고객에게 먼저 안내하고, [환불하기]로 전액 환불하세요.</p>' +
        '</div>' +
        '<div class="modal-card__foot">' +
          '<button class="btn-sm" data-close>취소</button>' +
          '<button class="btn-sm is-dark" id="alertSend">📧 메일 보내기</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(box);
    box.addEventListener('click', function (ev) { if (ev.target === box || ev.target.closest('[data-close]')) box.remove(); });
    box.querySelector('#alertSend').addEventListener('click', function () {
      o.stockAlertSent = true;
      o.custNotified = true;
      o.notifiedAt = Date.now();
      saveOrder(o);
      box.remove();
      render(o);
    });
  }

  /* ===== 일부 품절 → 고객 문의 =====
     여러 상품 주문에서 일부만 품절일 때, 고객에게 상황을 알리고
     '재고 있는 것만 받을지 / 전부 취소할지' 답변을 받아 처리한다. */
  function openPartialInquiry(o) {
    var box = document.createElement('div');
    box.className = 'modal-overlay is-open';
    box.innerHTML =
      '<div class="modal-card" style="max-width:540px;">' +
        '<div class="modal-card__head"><h3>고객에게 문의 (일부 품절)</h3><button class="modal-close" data-close>×</button></div>' +
        '<div class="modal-card__body">' +
          '<div class="cust-mail"><div class="cust-mail__body">Hi ' + esc(o.cust) + ',<br><br>' +
            'One of the items in your order <b>' + esc(o.no) + '</b> is currently <b>out of stock</b>. ' +
            'Would you like us to:<br>' +
            '&nbsp;&nbsp;① <b>ship the in-stock item now</b> and refund the out-of-stock one, or<br>' +
            '&nbsp;&nbsp;② <b>cancel the whole order</b> for a full refund?<br><br>' +
            'Please let us know and we will proceed right away.<br><br>' +
            '<span class="od-muted">(주문 상품 중 하나가 품절입니다. ① 재고 있는 것만 발송+나머지 환불 / ② 전체 취소·환불 중 어떻게 할지 여쭙니다.)</span></div></div>' +
        '</div>' +
        '<div class="modal-card__foot"><button class="btn-sm" data-close>취소</button>' +
          '<button class="btn-sm is-dark" id="paSend">📧 메일 보내기</button></div>' +
      '</div>';
    document.body.appendChild(box);
    box.addEventListener('click', function (ev) { if (ev.target === box || ev.target.closest('[data-close]')) box.remove(); });
    box.querySelector('#paSend').addEventListener('click', function () {
      o.custAsked = true;
      o.custNotified = true;                      // 소통함 → 미배송 차지백 예방
      o.notifiedAt = Date.now();
      var oosL = (o.lines || []).filter(lineOos);
      var okL = (o.lines || []).filter(function (l) { return !lineOos(l); });
      o.custReply = (oosL.length && okL.length) ? (Math.random() < 0.6 ? 'partial' : 'cancel')
        : (oosL.length ? 'cancel' : 'all');       // 전부 품절→취소 / 품절 없음→그대로 발송
      saveOrder(o);
      box.remove();
      render(o);
    });
  }

  function partialReplyBanner(o) {
    if (!o.custAsked || !o.custReply) return '';
    var st = 'background:#eef4ff;border:1px solid #d6e4ff;border-radius:12px;padding:14px 18px;margin:14px 0 6px;';
    if (o.custReply === 'partial') {
      return '<div style="' + st + '"><div style="font-weight:800;margin-bottom:4px;">📩 고객 답변: 재고 있는 상품만 받겠습니다.</div>' +
        '<div style="font-size:0.85rem;line-height:1.6;"><b>[주문 편집하기]</b> 에서 품절 상품의 수량을 0으로 만들어 빼고(부분 환불됨), 남은 상품을 아마존에서 소싱해 발주하세요.</div></div>';
    }
    if (o.custReply === 'cancel') {
      return '<div style="' + st + '"><div style="font-weight:800;margin-bottom:4px;">📩 고객 답변: 전부 취소하고 환불해 주세요.</div>' +
        '<div style="font-size:0.85rem;line-height:1.6;"><b>[환불하기(주문 취소)]</b> 로 전액 환불하세요.</div></div>';
    }
    return '<div style="' + st + '"><div style="font-weight:800;">📩 고객 답변: 주문한 상품 그대로 다 보내주세요.</div></div>';
  }

  /* Order risk 카드의 아이콘을 누르면 뜨는 상세 분석.
     감지된 신호만 나열하고 결론은 내려주지 않는다 (판단은 수강생 몫) */
  function riskSignals(o) {
    var s = [];
    if (o.billTo && o.billTo !== o.cust) {
      s.push(['청구지 명의 불일치',
        '결제한 사람(' + esc(o.billTo) + ')과 받는 사람(' + esc(o.cust) + ')의 이름이 다릅니다. ' +
        '도난 카드로 결제한 뒤 다른 주소로 받는 전형적인 수법이지만, 선물 주문일 수도 있습니다.']);
    }
    if ((o.custOrderNo || 1) === 1) {
      s.push(['첫 주문 고객',
        '이 스토어에서 구매 이력이 없는 고객입니다.']);
    }
    return s;
  }

  function openRiskDetail(o) {
    var lvl = o.risk || 'low';
    var label = lvl === 'high' ? 'High' : (lvl === 'medium' ? 'Medium' : 'Low');
    var signals = riskSignals(o);

    var box = document.createElement('div');
    box.className = 'modal-overlay is-open';
    box.innerHTML =
      '<div class="modal-card">' +
        '<div class="modal-card__head">' +
          '<h3>Order risk — ' + label + '</h3>' +
          '<button class="modal-close" data-close>×</button>' +
        '</div>' +
        '<div class="modal-card__body">' +
          '<div class="od-risk" style="margin-bottom:10px;">' +
            '<i style="width:' + (lvl === 'high' ? 100 : lvl === 'medium' ? 60 : 28) + '%;' +
              'background:' + (lvl === 'high' ? '#e03131' : lvl === 'medium' ? '#f59e0b' : '#1aab5b') + ';"></i>' +
          '</div>' +
          '<div class="od-risk__labels" style="margin-bottom:18px;">' +
            '<span' + (lvl === 'low' ? ' class="on"' : '') + '>Low</span>' +
            '<span' + (lvl === 'medium' ? ' class="on"' : '') + '>Medium</span>' +
            '<span' + (lvl === 'high' ? ' class="on"' : '') + '>High</span>' +
          '</div>' +

          (signals.length
            ? '<div class="risk-sig__title">감지된 신호</div>' +
              signals.map(function (s) {
                return '<div class="risk-sig">' +
                  '<div class="risk-sig__name">⚠ ' + s[0] + '</div>' +
                  '<div class="risk-sig__desc">' + s[1] + '</div>' +
                '</div>';
              }).join('')
            : '<p class="od-muted" style="margin:0;">특별히 감지된 신호가 없습니다.</p>') +

          '<div class="risk-sig__foot">' +
            '위험도가 높다고 <b>반드시 사기인 것은 아니고</b>, 낮다고 안전한 것도 아닙니다. ' +
            '배송지·청구지·연락처를 직접 확인하고 판단하세요.' +
          '</div>' +
        '</div>' +
        '<div class="modal-card__foot">' +
          '<button class="btn-sm" data-close>닫기</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(box);

    box.addEventListener('click', function (ev) {
      if (ev.target === box || ev.target.closest('[data-close]')) box.remove();
    });
  }

  // 헤더 옆 리스크 뱃지 — Low 는 표시하지 않는다
  function riskBadge(o) {
    if (o.risk === 'high') return '<span class="risk-badge high">⚠ High risk</span>';
    if (o.risk === 'medium') return '<span class="risk-badge med">⚠ Medium risk</span>';
    return '';
  }

  function riskBar(o) {
    var lvl = o.risk || 'low';
    var pct = lvl === 'high' ? 100 : (lvl === 'medium' ? 60 : 28);
    var color = lvl === 'high' ? '#e03131' : (lvl === 'medium' ? '#f59e0b' : '#1aab5b');
    var text = lvl === 'high'
      ? '차지백 위험이 높습니다. 발주하기 전에 주문을 검토하세요.'
      : lvl === 'medium'
        ? '차지백 위험이 보통입니다. 발주하기 전에 주문을 검토하세요.'
        : '차지백 위험이 낮습니다. 발주해도 됩니다.';
    return '<div class="od-card">' +
      '<div class="od-card__head od-card__head--icon">Order risk' +
        '<button class="risk-info" id="btnRisk" title="위험 신호 자세히 보기">🔍</button>' +
      '</div>' +
      '<div class="od-card__body">' +
        '<div class="od-risk"><i style="width:' + pct + '%;background:' + color + ';"></i></div>' +
        '<div class="od-risk__labels"><span' + (lvl === 'low' ? ' class="on"' : '') + '>Low</span>' +
          '<span' + (lvl === 'medium' ? ' class="on"' : '') + '>Medium</span>' +
          '<span' + (lvl === 'high' ? ' class="on"' : '') + '>High</span></div>' +
        '<p class="od-muted" style="margin:12px 0 0;">' + text + '</p>' +
      '</div>' +
    '</div>';
  }

  // 타임라인 — 주문이 들어온 시각을 기준으로 역순 이벤트 생성
  function timeline(o) {
    var g = esc(o.gateway || 'PayPal Wallet');
    var payout = (o.grandTotal || 0) * 0.95;   // 결제 수수료를 뗀 정산 예정액
    var events = [
      [1, money(payout) + ' USD will be added to your next payout.'],
      [0, money(o.grandTotal) + ' USD was captured on ' + g + '.'],
      [0, 'Order confirmation email was sent to ' + esc(o.cust) +
          (o.email ? ' (' + esc(o.email) + ')' : '') + '.'],
      [0, 'A ' + money(o.grandTotal) + ' USD capture is pending on ' + g + '.'],
      [0, money(o.grandTotal) + ' USD was authorized on ' + g + '.'],
      [0, 'Confirmation ' + esc(o.no.replace('#', '')) + 'CNF was generated for this order.'],
      [0, esc(o.cust) + ' placed this order on ' + esc(o.channel) + '.'],
    ];
    return '<div class="od-box">' +
      '<div class="od-box__title">Timeline</div>' +
      '<div class="od-comment">Leave a comment...</div>' +
      '<div class="od-tl">' +
        '<div class="od-tl__day">' + fmtDay(o.ts) + '</div>' +
        events.map(function (e) {
          return '<div class="od-tl__row">' +
            '<span class="od-tl__dot"></span>' +
            '<span class="od-tl__text">' + e[1] + '</span>' +
            '<span class="od-tl__time">' + fmtTime(o.ts, -e[0]) + '</span>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>';
  }

  function addressBlock(name, o) {
    // 정보가 누락된 주문은 실제로 빈 칸이 보인다 → 수강생이 직접 알아채야 함
    var lines = [
      esc(name),
      o.addr ? esc(o.addr) : '<span class="od-missing">주소 없음</span>',
      esc(o.city || ''),
      o.zip ? esc(o.zip) : '<span class="od-missing">우편번호 없음</span>',
      'United States',
    ];
    return lines.join('<br>');
  }

  function render(o) {
    var itemCount = (o.lines || []).reduce(function (a, l) { return a + l.qty; }, 0);

    document.getElementById('odRoot').innerHTML =
      '<div class="od-top">' +
        '<a class="od-back" href="order-practice.html">←</a>' +
        '<h2 class="od-no">' + esc(o.no) + '</h2>' +
        badges(o) + riskBadge(o) +
        '<div class="od-top__actions">' +
          // 차지백이 접수된 건은 환불하기·품절 안내 메일 액션을 숨긴다
          ((o.chargeback || o.nrcb)
            ? ''
            : (o.payment === 'refunded'
                ? '<button class="btn-sm" disabled>환불 완료</button>'
                : '<button class="btn-sm is-danger" id="btnRefund">환불하기 (주문 취소)</button>') +
              '<button class="btn-sm" id="btnStockAlert">' + (o.stockAlertSent ? '✅ 품절 안내 보냄' : '📧 품절 안내 메일') + '</button>' +
              // 여러 상품 주문은 일부 품절 시 고객에게 문의
              ((o.lines && o.lines.length > 1 && o.payment !== 'refunded' && o.fulfillment !== 'fulfilled')
                ? '<button class="btn-sm" id="btnPartialAsk">' + (o.custAsked ? '✅ 고객 문의함' : '📧 일부 품절 문의') + '</button>' : '')) +
          '<button class="btn-sm" id="btnEdit">주문 편집하기</button>' +
        '</div>' +
      '</div>' +
      '<div class="od-sub">' + fmtFull(o.ts) + ' from ' + esc(o.channel) + '</div>' +

      cbBanner(o) +
      nrcbBanner(o) +
      partialReplyBanner(o) +

      '<div class="od-grid">' +
        // ===== 왼쪽 =====
        '<div>' +
          '<div class="od-box">' +
            '<div class="od-tag attn">📦 ' +
              (o.fulfillment === 'fulfilled' ? 'Fulfilled' : 'Unfulfilled') + '</div>' +
            '<div class="od-method">🚚 ' + esc(o.method) + '</div>' +
            stockBox(o) +
            '<div class="od-lines">' + lineRows(o) + '</div>' +
            (o.fulfillment === 'fulfilled'
              ? '<div class="od-done">✅ 발주 완료 — 배송번호 <b>' + esc((o.tracking && o.tracking.number) || '-') +
                '</b> (' + esc((o.tracking && o.tracking.carrier) || '-') + ')</div>'
              : o.payment === 'refunded'
                ? '<div class="od-done">환불된 주문입니다. 발주하지 않습니다.</div>'
                : '<div class="od-actions">' +
                    '<a class="btn-sm is-dark" href="amazon.html?no=' + encodeURIComponent(o.no) + '" target="_blank" rel="noopener" style="text-decoration:none;">🛒 아마존에서 주문하기</a>' +
                    '<button class="btn-sm" id="btnFulfill">Mark as fulfilled</button>' +
                    '<button class="btn-sm" id="btnLabel">Create shipping label</button>' +
                  '</div>' +
                  (o.amazon && o.amazon.complete
                    ? '<div class="od-src ok">✅ 아마존 주문 완료 · 배송번호 ' + esc(o.amazon.tracking) +
                        (o.amazon.correct ? '' : ' <span style="color:#c0272d;">(주문에 없는 상품 포함)</span>') + '</div>'
                    : '<div class="od-src">🛒 먼저 <b>아마존에서 상품을 주문</b>해 배송번호(TBA)를 받아오세요.</div>')) +
          '</div>' +

          '<div class="od-box">' +
            '<div class="od-tag">💳 ' + (o.payment === 'refunded' ? 'Refunded' : 'Paid') + '</div>' +
            '<table class="od-money">' +
              '<tr><td>Subtotal</td><td>' + itemCount + (itemCount === 1 ? ' item' : ' items') + '</td>' +
                '<td class="r">' + money(o.total) + '</td></tr>' +
              '<tr><td>Shipping</td><td>' + esc(o.method) + '</td>' +
                '<td class="r">' + money(o.shipping) + '</td></tr>' +
              '<tr><td>Taxes</td><td>Tax details</td><td class="r">' + money(o.tax) + '</td></tr>' +
              '<tr class="tot"><td>Total</td><td></td><td class="r">' + money(o.grandTotal) + '</td></tr>' +
            '</table>' +
            '<table class="od-money paid">' +
              '<tr><td>Paid</td><td></td><td class="r">' +
                (o.payment === 'refunded' ? money(0) : money(o.grandTotal)) + '</td></tr>' +
            '</table>' +
          '</div>' +

          timeline(o) +
        '</div>' +

        // ===== 오른쪽 =====
        '<div>' +
          '<div class="od-card">' +
            '<div class="od-card__head">Notes</div>' +
            '<div class="od-card__body od-muted">No notes from customer</div>' +
          '</div>' +

          '<div class="od-card">' +
            '<div class="od-card__head">Customer</div>' +
            '<div class="od-card__body">' +
              '<a href="#">' + esc(o.cust) + '</a>' +
              '<div class="od-muted" style="margin-top:4px;">' +
                (o.custOrderNo || 1) + (o.custOrderNo === 1 ? ' order' : ' orders') + '</div>' +

              '<div class="od-card__sub">Contact information</div>' +
              (o.email ? '<a href="#">' + esc(o.email) + '</a>' : '<span class="od-missing">이메일 없음</span>') +
              '<div style="margin-top:4px;">' +
                (o.phone ? esc(o.phone) : '<span class="od-missing">No phone number</span>') + '</div>' +

              '<div class="od-card__sub">Shipping address</div>' +
              addressBlock(o.cust, o) +

              '<div class="od-card__sub">Billing address</div>' +
              addressBlock(o.billTo || o.cust, o) +
            '</div>' +
          '</div>' +

          '<div class="od-card">' +
            '<div class="od-card__head">Conversion summary</div>' +
            '<div class="od-card__body od-muted">' +
              '<div>🛒 This is their ' + ordinal(o.custOrderNo || 1) + ' order</div>' +
              '<div style="margin-top:6px;">👁 1st session from shopify.com</div>' +
              '<div style="margin-top:6px;">🖥 1 session over 1 day</div>' +
            '</div>' +
          '</div>' +

          riskBar(o) +
        '</div>' +
      '</div>';

    var f = document.getElementById('btnFulfill');
    if (f) f.addEventListener('click', function () { openFulfill(o); });

    var lb = document.getElementById('btnLabel');
    if (lb) lb.addEventListener('click', function () {
      location.href = 'order-label.html?no=' + encodeURIComponent(o.no);
    });

    var bt = document.getElementById('btnBatch');
    if (bt) bt.addEventListener('click', function () {
      alert('일괄 배송 처리 기능은 이 연습에서 사용되지 않습니다.');
    });

    var e = document.getElementById('btnEdit');
    if (e) e.addEventListener('click', function () {
      location.href = 'order-edit.html?no=' + encodeURIComponent(o.no);
    });

    var r = document.getElementById('btnRefund');
    if (r) r.addEventListener('click', function () { openRefund(o); });

    var ce = document.getElementById('cbEvidence');
    if (ce) ce.addEventListener('click', function () {
      location.href = 'order-chargeback.html?no=' + encodeURIComponent(o.no);
    });
    var ca = document.getElementById('cbAccept');
    if (ca) ca.addEventListener('click', function () {
      if (!confirm('차지백을 수용하면 항소 없이 손실이 확정됩니다.\n순 손실 ' +
        money((o.chargeback && o.chargeback.loss) || 0) + '. 수용할까요?')) return;
      resolveChargeback(o, 'accepted');
      render(o);
    });

    var rk = document.getElementById('btnRisk');
    if (rk) rk.addEventListener('click', function () { openRiskDetail(o); });

    var sa = document.getElementById('btnStockAlert');
    if (sa) sa.addEventListener('click', function () { openStockAlert(o); });

    var pa = document.getElementById('btnPartialAsk');
    if (pa) pa.addEventListener('click', function () { openPartialInquiry(o); });

    var nc = document.getElementById('nrContact');
    if (nc) nc.addEventListener('click', function () { openNrContact(o); });
    var nd = document.getElementById('nrDispute');
    if (nd) nd.addEventListener('click', function () { openNrDispute(o); });
    var na = document.getElementById('nrAccept');
    if (na) na.addEventListener('click', function () {
      if (!confirm('미배송 차지백을 수용하면 손실이 확정됩니다.\n손실 ' + money((o.nrcb && o.nrcb.loss) || 0) + '. 수용할까요?')) return;
      resolveNrCb(o, 'lost', 'accepted'); render(o); showNrResult(o, 'accepted');
    });

    bindZoom(o);

    // 사기 주문을 발주 처리했다면 차지백 이벤트 발생 (직접 처리·라벨 구매 모두 이 render 로 귀결)
    fireChargebackIfNeeded(o);
  }

  /* ---------- 발주 처리 (Mark as fulfilled) ----------
     드롭쉬핑에서는 내가 직접 배송하지 않는다.
     아마존에서 고객 주소로 주문하면 아마존이 배송번호(Tracking number)를 주고,
     그 번호를 여기에 넣어야 고객이 배송 조회를 할 수 있다. */
  var CARRIERS = ['Amazon Logistics', 'UPS', 'USPS', 'FedEx', 'DHL eCommerce', 'Other'];

  // 아직 아마존에서 주문(소싱)하지 않았을 때 안내 (품절/단종이라고 알려주지 않음 — 판단은 학생 몫)
  function showSourcePrompt(o) {
    var box = document.createElement('div');
    box.className = 'modal-overlay is-open';
    box.innerHTML =
      '<div class="modal-card" style="max-width:460px;">' +
        '<div class="modal-card__head"><h3>먼저 아마존에서 주문하세요</h3><button class="modal-close" data-close>×</button></div>' +
        '<div class="modal-card__body">' +
          '<p style="margin:0;font-size:0.92rem;line-height:1.7;">드랍쉬핑은 내가 직접 배송하지 않습니다. ' +
          '<b>아마존에서 이 주문의 상품을 고객 주소로 주문</b>하고, 아마존이 발급한 <b>배송번호(TBA)</b>를 받아와야 발주를 완료할 수 있습니다.<br>' +
          '<span class="od-muted">아마존에서 상품을 찾을 수 없다면(품절·단종·옵션 없음) 발송하지 말고 [환불하기]로 처리하세요.</span></p>' +
        '</div>' +
        '<div class="modal-card__foot">' +
          '<button class="btn-sm" data-close>취소</button>' +
          '<a class="btn-sm is-dark" href="amazon.html?no=' + encodeURIComponent(o.no) + '" target="_blank" rel="noopener" style="text-decoration:none;">🛒 아마존에서 주문하기</a>' +
        '</div>' +
      '</div>';
    document.body.appendChild(box);
    box.addEventListener('click', function (ev) { if (ev.target === box || ev.target.closest('[data-close]')) box.remove(); });
  }

  function openFulfill(o) {
    var fresh = load(); if (fresh) o = fresh;      // 아마존 탭에서의 소싱 반영
    if (!o.amazon || !o.amazon.complete) { showSourcePrompt(o); return; }

    var count = (o.lines || []).reduce(function (a, l) { return a + l.qty; }, 0);

    var box = document.createElement('div');
    box.className = 'modal-overlay is-open';
    box.innerHTML =
      '<div class="modal-card" style="max-width:600px;">' +
        '<div class="modal-card__head">' +
          '<h3>발주 처리 (Mark as fulfilled)</h3>' +
          '<button class="modal-close" data-close>×</button>' +
        '</div>' +
        '<div class="modal-card__body">' +
          '<div class="ff-guide">' +
            '📦 <b>아마존에서 고객 주소로 주문한 뒤</b>, 아마존이 발급한 <b>배송번호(Tracking number)</b>를 여기에 입력합니다.<br>' +
            '<span class="od-muted">이 번호가 있어야 고객이 배송 상황을 조회할 수 있습니다. ' +
            '번호 없이 처리하면 고객 문의와 분쟁으로 이어집니다.</span>' +
          '</div>' +

          '<div class="ff-head">' +
            '<span class="od-tag attn" style="margin:0;">📦 Unfulfilled (' + count + ')</span>' +
            '<a href="#" class="ff-link" onclick="return false;">Print packing slip</a>' +
          '</div>' +
          '<div class="od-method">🚚 ' + esc(o.method) + '</div>' +

          '<div class="ff-items">' +
            (o.lines || []).map(function (l) {
              var img = l.image
                ? '<img class="od-img" src="' + esc(l.image) + '" alt="">'
                : '<span class="od-img od-img--empty">?</span>';
              return '<div class="ff-item">' +
                '<input type="checkbox" checked disabled>' +
                img +
                '<div class="od-line__info">' +
                  '<span class="od-line__name">' + esc(l.name) + '</span>' +
                  '<div class="od-line__sku">' + esc(l.sku || '') + '</div>' +
                '</div>' +
                '<span class="ff-qty">' + l.qty + ' of ' + l.qty + '</span>' +
              '</div>';
            }).join('') +
          '</div>' +

          '<div class="prod-form" style="margin-top:18px;">' +
            '<div class="field">' +
              '<label>배송번호 (Tracking number) <span style="color:var(--danger);">*</span></label>' +
              '<input type="text" id="ffTracking" placeholder="예: TBA123456789000">' +
            '</div>' +
            '<div class="field">' +
              '<label>배송사 (Shipping carrier)</label>' +
              '<select id="ffCarrier" style="width:100%;padding:11px 12px;border:1px solid var(--border);border-radius:8px;font-size:0.88rem;">' +
                CARRIERS.map(function (c) { return '<option>' + c + '</option>'; }).join('') +
              '</select>' +
            '</div>' +
          '</div>' +

          '<label style="display:inline-flex;align-items:center;gap:7px;font-size:0.85rem;">' +
            '<input type="checkbox" id="ffNotify" checked> 고객에게 배송 알림 메일 보내기' +
          '</label>' +
          '<div id="ffError" style="color:var(--danger);font-size:0.82rem;margin-top:10px;"></div>' +
        '</div>' +
        '<div class="modal-card__foot">' +
          '<button class="btn-sm" data-close>취소</button>' +
          '<button class="btn-sm is-dark" id="ffGo">Mark as fulfilled</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(box);

    box.addEventListener('click', function (ev) {
      if (ev.target === box || ev.target.closest('[data-close]')) box.remove();
    });

    box.querySelector('#ffGo').addEventListener('click', function () {
      var num = box.querySelector('#ffTracking').value.trim();
      if (!num) {
        box.querySelector('#ffError').textContent = '배송번호를 입력해야 발주 처리를 완료할 수 있습니다.';
        return;
      }
      if (o.amazon && o.amazon.tracking && num.toUpperCase() !== o.amazon.tracking.toUpperCase()) {
        box.querySelector('#ffError').textContent = '아마존에서 받은 배송번호(TBA)와 일치하지 않습니다. 정확히 복사해 붙여넣으세요.';
        return;
      }
      o.fulfillment = 'fulfilled';
      o.tracking = { number: num, carrier: box.querySelector('#ffCarrier').value };
      o.notified = box.querySelector('#ffNotify').checked;
      o.fulfilledAt = Date.now();
      saveOrder(o);
      box.remove();
      render(o);
    });
  }

  /* ---------- 환불하기 (주문 취소) ----------
     사기 주문을 걸러내거나, 품절이라 발주할 수 없을 때 쓰는 동작.
     결제 상태가 Refunded 로 바뀌고 목록에서 취소선이 그어진다. */
  function openRefund(o) {
    var box = document.createElement('div');
    box.className = 'modal-overlay is-open';
    box.innerHTML =
      '<div class="modal-card">' +
        '<div class="modal-card__head">' +
          '<h3>환불하기 (주문 취소)</h3>' +
          '<button class="modal-close" data-close>×</button>' +
        '</div>' +
        '<div class="modal-card__body">' +
          '<p style="margin:0 0 16px;font-size:0.9rem;line-height:1.6;">' +
            '<b>' + esc(o.no) + '</b> 주문을 취소하고 고객에게 전액 환불합니다.<br>' +
            '<span class="od-muted">이 주문은 발주하지 않습니다.</span></p>' +
          '<table class="od-money" style="margin-bottom:16px;">' +
            '<tr><td>환불 금액</td><td></td><td class="r">' + money(o.grandTotal) + '</td></tr>' +
          '</table>' +
          '<div class="field">' +
            '<label>환불 사유 (직접 판단해 선택하세요)</label>' +
            '<select id="refundReason" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:8px;font-size:0.88rem;">' +
              '<option value="">사유 선택…</option>' +
              '<option value="fraud">사기 의심 주문 (차지백 위험)</option>' +
              '<option value="oos_stock">아마존 품절 (재고 없음)</option>' +
              '<option value="oos_discontinued">아마존 단종 (검색해도 없음)</option>' +
              '<option value="oos_option">요청 옵션 없음</option>' +
              '<option value="no_ship">배송 불가 지역</option>' +
              '<option value="etc">기타 (고객 요청 등)</option>' +
            '</select>' +
          '</div>' +
          '<label style="display:inline-flex;align-items:center;gap:7px;font-size:0.85rem;margin-top:6px;">' +
            '<input type="checkbox" id="refundMail" checked> 📧 고객에게 환불 안내 메일 보내기' +
          '</label>' +
          '<div class="cust-mail" style="margin-top:8px;">' +
            '<div class="cust-mail__body">' + refundEmailText(o) + '</div>' +
          '</div>' +
          '<div id="refundErr" style="color:var(--danger);font-size:0.82rem;margin-top:10px;"></div>' +
        '</div>' +
        '<div class="modal-card__foot">' +
          '<button class="btn-sm" data-close>취소</button>' +
          '<button class="btn-sm is-danger" id="refundGo">환불하기</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(box);

    function close() { box.remove(); }
    box.addEventListener('click', function (ev) {
      if (ev.target === box || ev.target.closest('[data-close]')) close();
    });

    box.querySelector('#refundGo').addEventListener('click', function () {
      var reason = box.querySelector('#refundReason').value;
      if (!reason) { box.querySelector('#refundErr').textContent = '환불 사유를 선택하세요.'; return; }
      o.payment = 'refunded';
      o.fulfillment = 'not_required';    // 발주하지 않는 주문
      o.refundReason = reason;
      o.refundedAt = Date.now();
      if (box.querySelector('#refundMail').checked) { o.custNotified = true; o.notifiedAt = Date.now(); }
      saveOrder(o);
      close();
      render(o);                         // 화면 갱신 (뱃지가 Refunded 로 바뀜)
    });
  }

  /* ---------- 사진 크게 보기 (여러 장이면 넘겨보기) ---------- */
  var zoomReady = false;

  function bindZoom(o) {
    current = o;                 // 갤러리가 참조할 현재 주문
    if (zoomReady) return;       // 화면을 다시 그려도 이벤트는 한 번만 건다
    zoomReady = true;

    var box = document.createElement('div');
    box.className = 'img-zoom';
    box.innerHTML =
      '<button class="img-zoom__close" aria-label="닫기">×</button>' +
      '<button class="img-zoom__nav prev" aria-label="이전">‹</button>' +
      '<img class="img-zoom__img" src="" alt="">' +
      '<button class="img-zoom__nav next" aria-label="다음">›</button>' +
      '<div class="img-zoom__cap"></div>' +
      '<div class="img-zoom__thumbs"></div>';
    document.body.appendChild(box);

    var imgEl = box.querySelector('.img-zoom__img');
    var capEl = box.querySelector('.img-zoom__cap');
    var thumbsEl = box.querySelector('.img-zoom__thumbs');
    var prevBtn = box.querySelector('.prev');
    var nextBtn = box.querySelector('.next');

    var gallery = [];   // 현재 열려 있는 상품의 사진들
    var name = '';
    var idx = 0;

    function show(i) {
      if (!gallery.length) return;
      idx = (i + gallery.length) % gallery.length;   // 끝에서 넘기면 처음으로
      imgEl.src = gallery[idx];
      capEl.textContent = name + (gallery.length > 1 ? '  (' + (idx + 1) + ' / ' + gallery.length + ')' : '');
      thumbsEl.querySelectorAll('img').forEach(function (t, n) {
        t.classList.toggle('on', n === idx);
      });
    }

    function open(line) {
      gallery = (line.images && line.images.length) ? line.images : (line.image ? [line.image] : []);
      if (!gallery.length) return;
      name = line.name;

      var multi = gallery.length > 1;
      prevBtn.hidden = nextBtn.hidden = !multi;
      thumbsEl.hidden = !multi;
      thumbsEl.innerHTML = multi
        ? gallery.map(function (src, n) {
            return '<img src="' + esc(src) + '" data-i="' + n + '" alt="">';
          }).join('')
        : '';

      show(0);
      box.classList.add('is-open');
    }
    function close() {
      box.classList.remove('is-open');
      imgEl.src = '';
      gallery = [];
    }

    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('.is-zoom');
      if (trigger) {
        var line = ((current && current.lines) || [])[Number(trigger.dataset.line)];
        if (line) open(line);
        return;
      }
      if (!box.classList.contains('is-open')) return;

      if (e.target.closest('.img-zoom__nav')) {           // 화살표
        e.stopPropagation();
        show(idx + (e.target.closest('.next') ? 1 : -1));
        return;
      }
      var thumb = e.target.closest('.img-zoom__thumbs img');
      if (thumb) { e.stopPropagation(); show(Number(thumb.dataset.i)); return; }
      if (e.target.closest('.img-zoom')) close();         // 배경이나 × 를 누르면 닫힘
    });

    document.addEventListener('keydown', function (e) {
      if (!box.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') show(idx + 1);
      if (e.key === 'ArrowLeft') show(idx - 1);
    });
  }

  (async function init() {
    var user = await Auth.require();
    if (!user) return;

    var o = load();
    if (!o) {
      document.getElementById('odRoot').innerHTML =
        '<div class="page-head"><h2>주문을 찾을 수 없습니다</h2>' +
        '<p>주문 목록에서 다시 선택해주세요.</p></div>' +
        '<a class="btn-primary" href="order-practice.html" style="text-decoration:none;padding:10px 18px;">발주 연습으로 돌아가기</a>';
      return;
    }
    render(o);
  })();
})();
