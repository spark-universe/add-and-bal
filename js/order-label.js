/* =========================================================
   배송 라벨 만들기 (쇼피파이 Create shipping label 재현)
   - 주문 상세에서 [Create shipping label] → order-label.html?no=#1150

   [중요] 이건 '내가 직접 물건을 보낼 때' 쓰는 화면이다.
   드롭쉬핑에서는 아마존이 고객에게 직접 보내므로 라벨을 살 일이 없다.
   그래서 화면은 그대로 재현하되, 라벨을 구매하면
   "아마존 배송번호를 넣는 Mark as fulfilled 를 쓰는 게 맞다"고 알려준다.
   ========================================================= */
(function () {
  var ORDERS = 'practice_orders';
  var order = null;

  // esc/money 는 js/util.js 의 공통 함수 사용
  function loadOrders() {
    try { return JSON.parse(localStorage.getItem(ORDERS)) || []; } catch (e) { return []; }
  }

  function render(o) {
    var items = (o.lines || []).reduce(function (a, l) { return a + l.qty; }, 0);
    var back = 'order-detail.html?no=' + encodeURIComponent(o.no);

    document.getElementById('olRoot').innerHTML =
      '<div class="od-top">' +
        '<a class="od-back" href="' + back + '">←</a>' +
        '<h2 class="od-no">배송 라벨 만들기</h2>' +
        '<div class="od-top__actions"><button class="btn-sm" disabled>Print packing slip</button></div>' +
      '</div>' +
      '<div class="od-sub">주문 ' + esc(o.no) + ' · ' + esc(o.date || '') + '</div>' +

      '<div class="ol-guide">' +
        '💡 이 화면은 <b>내가 직접 물건을 포장해서 보낼 때</b> 쓰는 기능입니다. ' +
        '아마존이 고객에게 바로 보내주는 방식에서는 라벨을 살 필요가 없습니다.' +
      '</div>' +

      '<div class="od-grid">' +
        '<div>' +
          '<div class="od-box">' +
            '<div class="od-box__title">배송지 (Shipping address)</div>' +
            '<div style="font-size:0.86rem;line-height:1.7;">' +
              esc(o.cust) + '<br>' +
              (o.addr ? esc(o.addr) : '<span class="od-missing">주소 없음</span>') + '<br>' +
              esc(o.city || '') + ' ' + (o.zip ? esc(o.zip) : '<span class="od-missing">우편번호 없음</span>') + '<br>' +
              'United States' +
            '</div>' +
          '</div>' +

          '<div class="od-box">' +
            '<div class="od-box__title">상품 (Items)</div>' +
            '<div class="od-lines">' +
              (o.lines || []).map(function (l) {
                var img = l.image
                  ? '<img class="od-img" src="' + esc(l.image) + '" alt="">'
                  : '<span class="od-img od-img--empty">?</span>';
                return '<div class="od-line">' +
                  img +
                  '<div class="od-line__info">' +
                    '<span class="od-line__name">' + esc(l.name) + '</span>' +
                    '<div class="od-line__sku">SKU: ' + esc(l.sku || '') + '</div>' +
                  '</div>' +
                  '<span class="ff-qty">' + l.qty + ' of ' + l.qty + '</span>' +
                  '<input class="oe-qty" type="number" value="0" min="0" step="0.1" title="무게(개당)">' +
                  '<span class="od-muted" style="font-size:0.8rem;">lb</span>' +
                '</div>';
              }).join('') +
            '</div>' +
          '</div>' +

          '<div class="od-box" style="text-align:center;">' +
            '<div class="od-box__title" style="text-align:left;">포장 (Package)</div>' +
            '<div style="font-size:2.4rem;margin:14px 0 8px;">📦</div>' +
            '<div style="font-weight:800;font-size:0.95rem;">저장된 포장 규격 추가</div>' +
            '<div class="od-muted" style="font-size:0.82rem;margin:6px 0 14px;">' +
              '포장을 추가해야 배송 요금이 계산됩니다.</div>' +
            '<button class="btn-sm is-dark" disabled>포장 추가</button>' +
          '</div>' +

          '<div class="od-box">' +
            '<div class="od-box__title">총 무게 (Total weight)</div>' +
            '<div style="display:flex;gap:8px;align-items:center;">' +
              '<input type="text" value="1.1023" readonly ' +
                'style="flex:1;padding:11px 12px;border:1px solid var(--border);border-radius:8px;font-size:0.88rem;background:#f6f7f9;">' +
              '<span class="od-muted" style="font-size:0.85rem;">lb</span>' +
            '</div>' +
          '</div>' +

          '<div class="od-box">' +
            '<div class="od-box__title">배송 서비스 (Shipping service)</div>' +
            '<div class="od-method">🚚 ' + esc(o.method) + ' · ' + money(o.shipping) + ' USD</div>' +
          '</div>' +
        '</div>' +

        '<div>' +
          '<div class="od-card">' +
            '<div class="od-card__head">요약 (Summary)</div>' +
            '<div class="od-card__body">' +
              '<table class="od-money">' +
                '<tr><td>소계</td><td></td><td class="r">' + money(o.shipping) + '</td></tr>' +
                '<tr class="tot"><td>합계</td><td></td><td class="r">' + money(o.shipping) + ' USD</td></tr>' +
              '</table>' +
              '<div class="od-card__sub">배송일</div>' +
              '<select style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:8px;font-size:0.88rem;">' +
                '<option>오늘</option><option>내일</option>' +
              '</select>' +
              '<label style="display:flex;gap:7px;align-items:flex-start;margin-top:14px;font-size:0.82rem;line-height:1.5;">' +
                '<input type="checkbox" checked> 고객에게 배송 확인 메일 지금 보내기' +
              '</label>' +
              '<button class="btn-primary" id="olBuy" style="width:100%;margin-top:16px;padding:11px;">' +
                '배송 라벨 구매 (' + money(o.shipping) + ')</button>' +
            '</div>' +
          '</div>' +

          '<div class="od-card">' +
            '<div class="od-card__head">상품 ' + items + '개</div>' +
            '<div class="od-card__body od-muted">이 주문의 상품을 한 상자로 보냅니다.</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.getElementById('olBuy').addEventListener('click', buy);
  }

  /* 라벨을 구매하면 배송번호가 자동 발급되고 발주 완료 처리된다.
     다만 이 연습에서 맞는 방식은 아마존 배송번호를 넣는 [Mark as fulfilled] 이므로 그 점을 알려준다. */
  function buy() {
    if (!confirm(
      '배송 라벨을 구매하면 내가 직접 포장해서 보내는 것으로 처리됩니다.\n\n' +
      '아마존이 고객에게 바로 보내는 방식이라면,\n' +
      '주문 상세의 [Mark as fulfilled] 에서 아마존 배송번호를 입력하는 것이 맞습니다.\n\n' +
      '그래도 라벨을 구매할까요?'
    )) return;

    var num = 'SHOP' + Math.floor(Math.random() * 900000000 + 100000000);
    order.fulfillment = 'fulfilled';
    order.tracking = { number: num, carrier: 'Shopify Shipping' };
    order.labelBought = true;
    order.fulfilledAt = Date.now();

    var orders = loadOrders();
    var i = orders.findIndex(function (x) { return x.no === order.no; });
    if (i !== -1) orders[i] = order;
    localStorage.setItem(ORDERS, JSON.stringify(orders));

    location.href = 'order-detail.html?no=' + encodeURIComponent(order.no);
  }

  (async function init() {
    var user = await Auth.require();
    if (!user) return;

    var no = new URLSearchParams(location.search).get('no');
    order = loadOrders().find(function (o) { return o.no === no; });

    if (!order) {
      document.getElementById('olRoot').innerHTML =
        '<div class="page-head"><h2>주문을 찾을 수 없습니다</h2></div>' +
        '<a class="btn-primary" href="order-practice.html" style="text-decoration:none;padding:10px 18px;">발주 연습으로 돌아가기</a>';
      return;
    }
    render(order);
  })();
})();
