/* =========================================================
   차지백 항소 (Chargeback response)
   - order-detail.html 의 [증거 제출하기] 로 진입: order-chargeback.html?no=#1083
   - 사기 주문의 차지백이므로 항소해도 항상 패소한다(교육용).
   - [Submit now] → 항소 제출 → 패소 → 손실 확정
     [Accept chargeback] → 즉시 수용 → 손실 확정
   ========================================================= */
(function () {
  var ORDERS = 'practice_orders';
  var CB_FEE = 15;

  var MONTHS = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function money(n) { return '$' + Number(n || 0).toFixed(2); }
  function fmtFull(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    var h = d.getHours(), ampm = h >= 12 ? 'pm' : 'am', h12 = h % 12 || 12;
    var mm = String(d.getMinutes()).padStart(2, '0');
    return MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear() +
      ' at ' + h12 + ':' + mm + ' ' + ampm;
  }
  function last4(s) {   // 카드 끝 4자리를 주문번호에서 안정적으로 생성
    var h = 0, t = String(s || '');
    for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
    return String(h % 10000).padStart(4, '0');
  }

  function loadOrders() {
    try { return JSON.parse(localStorage.getItem(ORDERS)) || []; } catch (e) { return []; }
  }
  function saveOrder(o) {
    var orders = loadOrders();
    var i = orders.findIndex(function (x) { return x.no === o.no; });
    if (i !== -1) { orders[i] = o; localStorage.setItem(ORDERS, JSON.stringify(orders)); }
  }
  function updateLog(o) {
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

  // 사기 주문 → 결과는 항상 손실 확정
  function resolve(o, resolution, won) {
    if (!o.chargeback || o.chargeback.status !== 'open') return;
    o.chargeback.status = won ? 'won' : 'lost';
    o.chargeback.resolution = resolution;    // 'accepted' | 'disputed_lost' | 'disputed_won'
    o.chargeback.resolvedAt = Date.now();
    saveOrder(o);
    updateLog(o);
  }

  function evidenceRow(icon, name, done) {
    return '<div class="cbr-ev">' +
      '<span class="cbr-ev__ic">' + (done ? '✅' : '⬜') + '</span>' +
      '<div class="cbr-ev__name">' + name + '</div>' +
      '<label class="cbr-ev__chk"><input type="checkbox" class="cbrEv"' + (done ? ' checked' : '') +
        '> 첨부함</label>' +
    '</div>';
  }

  function render(o) {
    var cb = o.chargeback;
    var resolved = cb.status !== 'open';
    var ship = o.addr + ', ' + o.city + ' ' + o.zip;

    document.getElementById('cbRoot').innerHTML =
      '<div class="od-top">' +
        '<a class="od-back" href="order-detail.html?no=' + encodeURIComponent(o.no) + '">←</a>' +
        '<h2 class="od-no">Chargeback response</h2>' +
        (resolved
          ? '<span class="ord-badge cb-lost"><span class="dot"></span>확정</span>'
          : '<span class="ord-badge attn"><span class="dot"></span>Draft</span>') +
      '</div>' +
      '<div class="od-sub">주문 ' + esc(o.no) + ' · ' + esc(o.cust) + '</div>' +

      '<div class="cbr-grid">' +
        // ===== 왼쪽 =====
        '<div>' +
          '<div class="od-box cbr-claim">' +
            '<div class="cbr-claim__head">🧾 ' + esc(o.cust) + '님이 ' + money(cb.total) +
              ' 차지백을 열었습니다</div>' +
            '<p class="od-muted" style="margin:8px 0 0;line-height:1.6;">' +
              esc(o.cust) + '님은 주문한 상품을 예상 수령일까지 받지 못했고, 판매자에게 전화했지만 ' +
              '연결되지 않았다고 합니다. 운송사 배송완료 확인(서명 포함) 등 ' +
              '구매자·대리 수령 증빙이나 약정/예상 배송일을 보여주는 자료를 제출해 보세요.</p>' +
            '<div class="cbr-reason">차지백 사유: <b>' + esc(cb.reason) + '</b></div>' +
            '<a class="btn-sm is-dark" href="chargeback-manual.html" target="_blank" rel="noopener" ' +
              'style="text-decoration:none;display:inline-block;margin-top:14px;">📕 차지백 대응 가이드 보기</a>' +
          '</div>' +

          '<div class="od-box">' +
            '<div class="cbr-h">이 분쟁이 부당한 이유</div>' +
            '<select id="cbrReason" class="cbr-select"' + (resolved ? ' disabled' : '') + '>' +
              '<option value="">사유를 선택하세요</option>' +
              '<option value="shipped">상품을 실제로 배송했습니다 (배송번호 있음)</option>' +
              '<option value="delivered">운송사 배송완료 기록이 있습니다</option>' +
              '<option value="contacted">고객과 정상적으로 연락했습니다</option>' +
              '<option value="etc">기타</option>' +
            '</select>' +
          '</div>' +

          '<div class="od-box">' +
            '<div class="cbr-h">추가 증거 (Additional evidence)</div>' +
            evidenceRow('', '고객 커뮤니케이션 (Customer communication)', false) +
            evidenceRow('', '배송 증빙 (Shipping documentation)', !!(o.tracking && o.tracking.number)) +
            evidenceRow('', '서비스 증빙 (Proof of service)', false) +
            evidenceRow('', '배송 정책 (Shipping policy)', true) +
          '</div>' +

          '<div class="od-box">' +
            '<div class="cbr-h">배송 정보 (Shipping details)</div>' +
            '<div class="od-muted" style="line-height:1.7;">' +
              (o.fulfilledAt ? fmtFull(o.fulfilledAt).split(' at ')[0] + ' 발송<br>' : '') +
              '배송지: ' + esc(ship) + '<br>' +
              '배송번호: <b>' + esc((o.tracking && o.tracking.number) || '없음') + '</b>' +
              ' (' + esc((o.tracking && o.tracking.carrier) || '-') + ')' +
            '</div>' +
          '</div>' +
        '</div>' +

        // ===== 오른쪽 =====
        '<div>' +
          '<div class="od-box cbr-side">' +
            '<div class="cbr-side__auto">📅 자동 제출: <b>' + fmtFull(cb.deadline) + '</b></div>' +
            '<div class="cbr-h" style="margin-top:14px;">Chargeback details</div>' +
            '<table class="cbr-detail">' +
              '<tr><td>주문</td><td class="r">' + esc(o.no) + '</td></tr>' +
              '<tr><td>판매 채널</td><td class="r">' + esc(o.channel) + '</td></tr>' +
              '<tr><td>고객</td><td class="r">' + esc(o.cust) + '</td></tr>' +
              '<tr><td>이메일</td><td class="r">' + esc(o.email || '-') + '</td></tr>' +
              '<tr><td>차지백 사유</td><td class="r">' + esc(cb.reason) + '</td></tr>' +
              '<tr><td>청구지 이름</td><td class="r">' + esc(o.billTo) + '</td></tr>' +
              '<tr><td>결제수단</td><td class="r">Visa •••• ' + last4(o.no) + '</td></tr>' +
            '</table>' +
            '<table class="cbr-money">' +
              '<tr><td>Dispute amount</td><td class="r">' + money(cb.amount) + '</td></tr>' +
              '<tr><td>Fee</td><td class="r">' + money(cb.fee) + '</td></tr>' +
              '<tr class="cbr-total"><td>Total</td><td class="r">' + money(cb.total) + '</td></tr>' +
            '</table>' +
            (resolved
              ? (cb.status === 'won'
                  ? '<div class="cb-alert is-won" style="margin-top:14px;">' +
                      '<div class="cb-alert__title">🎉 차지백 방어 성공 (항소 승소)</div>' +
                      '<div class="cb-alert__desc">판매대금 ' + money(cb.amount) + ' 을 지켰습니다.</div>' +
                    '</div>'
                  : '<div class="cb-alert is-lost" style="margin-top:14px;">' +
                      '<div class="cb-alert__title">💸 차지백 확정 (' +
                        (cb.resolution === 'accepted' ? '수용' : '항소 패소') + ')</div>' +
                      '<div class="cb-alert__desc">순 손실 -' + money(cb.loss) + '</div>' +
                    '</div>') +
                '<a class="btn-primary" href="order-detail.html?no=' + encodeURIComponent(o.no) +
                  '" style="display:block;text-align:center;text-decoration:none;margin-top:14px;">주문 상세로 돌아가기</a>'
              : '<div class="cbr-odds">⚖️ 항소 승소율 약 <b>30%</b> · 최종 판단은 카드사·은행이 합니다</div>' +
                '<label class="cbr-insight"><input type="checkbox" checked> Shopify 분석 자료 포함(권장)</label>' +
                '<button class="btn-primary" id="cbrSubmit" style="width:100%;margin-top:8px;">Submit now (항소 제출)</button>' +
                '<button class="btn-sm" id="cbrAccept" style="width:100%;margin-top:8px;">Accept chargeback (수용)</button>') +
          '</div>' +
        '</div>' +
      '</div>';

    if (resolved) return;

    document.getElementById('cbrSubmit').addEventListener('click', function () {
      var won = Math.random() < 0.30;                 // 사기 차지백은 정확히 소명해도 30%만 승소
      var resn = won ? 'disputed_won' : 'disputed_lost';
      resolve(o, resn, won);
      showResult(o, resn);
    });
    document.getElementById('cbrAccept').addEventListener('click', function () {
      if (!confirm('차지백을 수용하면 항소 없이 손실이 확정됩니다.\n순 손실 ' + money(cb.loss) + '. 수용할까요?')) return;
      resolve(o, 'accepted', false);
      showResult(o, 'accepted');
    });
  }

  function showResult(o, resolution) {
    var cb = o.chargeback;
    var won = resolution === 'disputed_won';
    var accepted = resolution === 'accepted';
    var profit = Number(o.total || 0) - Number(o.cost || 0);

    var edu = '<div class="cb-tip">⚖️ 차지백의 <b>최종 판단은 카드사·은행</b>이 합니다. ' +
      '아무리 정확하게, 모든 정보를 제출해도 <b>대개 고객 편</b>을 들기 때문에 승소가 어렵습니다(약 30%). ' +
      '그래서 이런 주문은 <b>애초에 받지(발주하지) 않는 것이 가장 안전</b>합니다. ' +
      '청구지·수령지 이름 불일치, 높은 위험도, 급한 특급배송은 대표적인 사기 신호입니다.</div>';

    var body;
    if (won) {
      body =
        '<p class="cb-lead">증거가 인정되어 이번엔 <b>차지백을 방어</b>했습니다. 판매대금을 지켰어요. ' +
          '다만 <b>운이 좋았을 뿐</b> — 사기 차지백은 대부분 패소합니다.</p>' +
        '<table class="cb-money">' +
          '<tr><td>판매대금 (유지)</td><td class="r">' + money(o.total) + '</td></tr>' +
          '<tr><td>상품 원가</td><td class="r">-' + money(o.cost || 0) + '</td></tr>' +
          '<tr class="cb-total"><td>이 주문 이익</td><td class="r">' + money(profit) + '</td></tr>' +
        '</table>' + edu;
    } else {
      body =
        '<p class="cb-lead">' + (accepted
          ? '차지백을 수용했습니다.'
          : '증거를 제출했지만 <b>사기(도난 카드) 차지백</b>은 판매자가 이기기 매우 어렵습니다. 결국 <b>패소</b>했습니다.') + '</p>' +
        '<table class="cb-money">' +
          '<tr><td>판매대금 (회수)</td><td class="r">-' + money(cb.amount) + '</td></tr>' +
          '<tr><td>상품 원가 (이미 지출)</td><td class="r">-' + money(o.cost || 0) + '</td></tr>' +
          '<tr><td>차지백 수수료</td><td class="r">-' + money(cb.fee) + '</td></tr>' +
          '<tr class="cb-total"><td>순 손실</td><td class="r">-' + money(cb.loss) + '</td></tr>' +
        '</table>' + edu;
    }

    var box = document.createElement('div');
    box.className = 'modal-overlay is-open';
    box.innerHTML =
      '<div class="modal-card cb-card">' +
        '<div class="cb-head' + (won ? ' is-won' : '') + '">' +
          '<div class="cb-emoji">' + (won ? '🎉' : (accepted ? '💸' : '❌')) + '</div>' +
          '<h3>' + (won ? '항소 승소! (운이 좋았어요)' : (accepted ? '차지백 수용 — 손실 확정' : '항소 패소 — 손실 확정')) + '</h3>' +
        '</div>' +
        '<div class="modal-card__body">' + body + '</div>' +
        '<div class="modal-card__foot">' +
          '<a class="btn-sm is-dark" href="order-detail.html?no=' + encodeURIComponent(o.no) +
            '" style="text-decoration:none;">주문 상세로</a>' +
        '</div>' +
      '</div>';
    document.body.appendChild(box);
  }

  (async function init() {
    var user = await Auth.require();
    if (!user) return;

    var no = new URLSearchParams(location.search).get('no');
    var o = loadOrders().find(function (x) { return x.no === no; });
    var root = document.getElementById('cbRoot');

    if (!o) {
      root.innerHTML = '<div class="page-head"><h2>주문을 찾을 수 없습니다</h2></div>' +
        '<a class="btn-primary" href="order-practice.html" style="text-decoration:none;padding:10px 18px;">발주 연습으로</a>';
      return;
    }
    if (!o.chargeback) {
      root.innerHTML = '<div class="page-head"><h2>이 주문에는 차지백이 없습니다</h2></div>' +
        '<a class="btn-primary" href="order-detail.html?no=' + encodeURIComponent(o.no) +
        '" style="text-decoration:none;padding:10px 18px;">주문 상세로</a>';
      return;
    }
    render(o);
  })();
})();
