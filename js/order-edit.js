/* =========================================================
   주문 편집 (쇼피파이 Edit order 재현)
   - 주문 상세에서 [주문 편집하기] → order-edit.html?no=#1150
   - 쓰임새: 2개 이상 주문인데 일부만 처리하는 경우
     (예: 3개 중 1개가 품절 → 그 줄을 빼거나 수량을 줄이고 나머지만 발주)
   - 수량을 바꾸거나 상품을 빼면 결제 금액(소계·세금·총액)이 다시 계산된다
   - 오른쪽 Summary 에 무엇이 어떻게 바뀌는지 요약되고, [주문 업데이트] 로 확정
   - TODO: 차액 환불 처리·정산 반영 (다음 단계)
   ========================================================= */
(function () {
  var ORDERS = 'practice_orders';
  var TAX_RATE = 0.0825;

  var MONTHS = ['January','February','March','April','May','June',
    'July','August','September','October','November','December'];

  var origin = null;   // 원본 주문 (비교용)
  var draft = null;    // 편집 중인 사본

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function money(n) { return '$' + Number(n || 0).toFixed(2); }
  function round2(n) { return Math.round(n * 100) / 100; }

  function fmtFull(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    var h = d.getHours(), ampm = h >= 12 ? 'pm' : 'am', h12 = h % 12 || 12;
    return MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear() +
      ' at ' + h12 + ':' + String(d.getMinutes()).padStart(2, '0') + ' ' + ampm;
  }

  function loadOrders() {
    try { return JSON.parse(localStorage.getItem(ORDERS)) || []; } catch (e) { return []; }
  }

  /* ---------- 금액 재계산 ---------- */
  function totals(o) {
    var sub = round2((o.lines || []).reduce(function (a, l) { return a + l.price * l.qty; }, 0));
    var cost = round2((o.lines || []).reduce(function (a, l) { return a + l.cost * l.qty; }, 0));
    var ship = (o.lines || []).length ? (o.shipping || 0) : 0;   // 상품이 다 빠지면 배송비도 없음
    var tax = round2(sub * TAX_RATE);
    return { sub: sub, cost: cost, ship: ship, tax: tax, grand: round2(sub + ship + tax) };
  }

  function itemCount(o) {
    return (o.lines || []).reduce(function (a, l) { return a + l.qty; }, 0);
  }

  /* ---------- 변경 요약 ---------- */
  function changes() {
    var out = [];
    origin.lines.forEach(function (ol, i) {
      var dl = draft.lines.find(function (x) { return x.key === ol.key; });
      if (!dl) {
        out.push({ text: esc(ol.name) + ' 삭제', amount: -round2(ol.price * ol.qty) });
      } else if (dl.qty !== ol.qty) {
        out.push({
          text: esc(ol.name) + ' 수량 ' + ol.qty + ' → ' + dl.qty,
          amount: round2((dl.qty - ol.qty) * ol.price)
        });
      }
    });
    return out;
  }

  /* ---------- 그리기 ---------- */
  function render() {
    var t = totals(draft);
    var ot = totals(origin);
    var diff = changes();
    var changed = diff.length > 0;

    document.getElementById('oeRoot').innerHTML =
      '<div class="od-top">' +
        '<a class="od-back" href="order-detail.html?no=' + encodeURIComponent(draft.no) + '">←</a>' +
        '<h2 class="od-no">' + esc(draft.no) + ' <span class="od-muted" style="font-weight:600;">›</span> 주문 편집</h2>' +
      '</div>' +
      '<div class="od-sub">' + fmtFull(draft.ts) + ' from ' + esc(draft.channel) + '</div>' +

      '<div class="od-grid">' +
        '<div>' +
          '<div class="od-box">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px;">' +
              '<span class="od-tag attn" style="margin:0;">📦 Unfulfilled</span>' +
              '<span style="display:flex;gap:6px;">' +
                '<button class="btn-sm" disabled>＋ 상품 추가</button>' +
                '<button class="btn-sm" disabled>＋ 직접 입력</button>' +
              '</span>' +
            '</div>' +
            (draft.lines.length
              ? '<div class="od-lines">' + draft.lines.map(lineRow).join('') + '</div>'
              : '<div class="oe-empty">상품이 모두 빠졌습니다. 이 경우 주문 편집이 아니라 ' +
                '<b>환불(주문 취소)</b> 을 해야 합니다.</div>') +
          '</div>' +

          '<div class="od-box">' +
            '<div class="od-box__title">결제</div>' +
            '<table class="od-money">' +
              '<tr><td>소계</td><td>' + itemCount(draft) + '개 상품</td>' +
                '<td class="r">' + money(t.sub) + '</td></tr>' +
              '<tr><td>배송비</td><td>' + esc(draft.method) + '</td>' +
                '<td class="r">' + money(t.ship) + '</td></tr>' +
              '<tr><td>세금</td><td>Tax details</td><td class="r">' + money(t.tax) + '</td></tr>' +
              '<tr class="tot"><td>합계</td><td></td><td class="r">' + money(t.grand) + '</td></tr>' +
            '</table>' +
            '<table class="od-money paid">' +
              '<tr><td>결제됨</td><td></td><td class="r">' + money(ot.grand) + '</td></tr>' +
              (changed
                ? '<tr><td style="color:var(--danger);">고객에게 환불</td><td></td>' +
                  '<td class="r" style="color:var(--danger);">' + money(Math.max(0, ot.grand - t.grand)) + '</td></tr>'
                : '') +
            '</table>' +
            '<div class="oe-note">세금은 주문을 업데이트하기 전까지 예상치입니다.</div>' +
          '</div>' +

          '<div class="od-box">' +
            '<div class="od-box__title">편집 사유</div>' +
            '<input type="text" id="oeReason" value="' + esc(draft.editReason || '') + '" ' +
              'placeholder="예: 3개 중 1개가 품절이라 수량을 줄임" ' +
              'style="width:100%;padding:11px 12px;border:1px solid var(--border);border-radius:8px;font-size:0.88rem;">' +
            '<div class="oe-note" style="margin-top:8px;">나만 볼 수 있습니다.</div>' +
          '</div>' +
        '</div>' +

        '<div>' +
          '<div class="od-card">' +
            '<div class="od-card__head">변경 요약</div>' +
            '<div class="od-card__body">' +
              (changed
                ? diff.map(function (c) {
                    return '<div class="oe-diff"><span>' + c.text + '</span>' +
                      '<b class="' + (c.amount < 0 ? 'minus' : 'plus') + '">' +
                      (c.amount < 0 ? '-' : '+') + money(Math.abs(c.amount)) + '</b></div>';
                  }).join('')
                : '<span class="od-muted">변경된 내용이 없습니다</span>') +
              '<button class="btn-primary" id="oeUpdate" style="width:100%;margin-top:16px;padding:11px;"' +
                (changed ? '' : ' disabled') + '>주문 업데이트</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';

    bind();
  }

  function lineRow(l, i) {
    var img = l.image
      ? '<img class="od-img" src="' + esc(l.image) + '" alt="">'
      : '<span class="od-img od-img--empty">?</span>';
    return '<div class="od-line">' +
      img +
      '<div class="od-line__info">' +
        '<span class="od-line__name" style="color:var(--primary);">' + esc(l.name) + '</span>' +
        '<div class="od-line__sku">' + esc(l.sku || '') + '</div>' +
      '</div>' +
      '<div class="od-line__qty">' + money(l.price) + '</div>' +
      '<input class="oe-qty" type="number" min="0" value="' + l.qty + '" data-i="' + i + '">' +
      '<div class="od-line__sum">' + money(l.price * l.qty) + '</div>' +
      '<button class="oe-del" data-i="' + i + '" title="이 상품 빼기">×</button>' +
    '</div>';
  }

  function bind() {
    document.querySelectorAll('.oe-qty').forEach(function (el) {
      el.addEventListener('change', function () {
        var i = Number(this.dataset.i);
        var q = parseInt(this.value, 10);
        if (!isFinite(q) || q < 0) q = 0;
        if (q === 0) draft.lines.splice(i, 1);      // 0개면 상품을 뺀 것과 같다
        else draft.lines[i].qty = q;
        keepReason();
        render();
      });
    });

    document.querySelectorAll('.oe-del').forEach(function (el) {
      el.addEventListener('click', function () {
        draft.lines.splice(Number(this.dataset.i), 1);
        keepReason();
        render();
      });
    });

    var up = document.getElementById('oeUpdate');
    if (up) up.addEventListener('click', update);
  }

  function keepReason() {
    var r = document.getElementById('oeReason');
    if (r) draft.editReason = r.value;
  }

  /* ---------- 확정 ---------- */
  function update() {
    keepReason();
    if (!draft.lines.length) {
      alert('상품이 하나도 없습니다.\n주문 전체를 취소하려면 주문 상세에서 [환불하기]를 사용하세요.');
      return;
    }
    if (!confirm('주문을 이대로 업데이트할까요?')) return;

    var t = totals(draft);
    var ot = totals(origin);

    draft.total = t.sub;
    draft.cost = t.cost;
    draft.shipping = t.ship;
    draft.tax = t.tax;
    draft.grandTotal = t.grand;
    draft.items = itemCount(draft);
    draft.refunded = round2((draft.refunded || 0) + Math.max(0, ot.grand - t.grand));  // 차액 환불
    draft.edited = true;
    draft.editedAt = Date.now();

    var orders = loadOrders();
    var i = orders.findIndex(function (x) { return x.no === draft.no; });
    if (i !== -1) orders[i] = draft;
    localStorage.setItem(ORDERS, JSON.stringify(orders));

    location.href = 'order-detail.html?no=' + encodeURIComponent(draft.no);
  }

  (async function init() {
    var user = await Auth.require();
    if (!user) return;

    var no = new URLSearchParams(location.search).get('no');
    var found = loadOrders().find(function (o) { return o.no === no; });

    if (!found) {
      document.getElementById('oeRoot').innerHTML =
        '<div class="page-head"><h2>주문을 찾을 수 없습니다</h2></div>' +
        '<a class="btn-primary" href="order-practice.html" style="text-decoration:none;padding:10px 18px;">발주 연습으로 돌아가기</a>';
      return;
    }

    // 상품 줄을 구분할 키를 붙여둔다 (삭제/수량변경을 원본과 대조하기 위해)
    found.lines.forEach(function (l, i) { if (!l.key) l.key = String(l.pid) + '-' + i; });

    origin = JSON.parse(JSON.stringify(found));
    draft = JSON.parse(JSON.stringify(found));
    render();
  })();
})();
