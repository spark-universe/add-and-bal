/* =========================================================
   시뮬 아마존 (드랍쉬핑 소싱 연습)
   - order-detail 의 [🛒 아마존에서 주문하기] → amazon.html?no=#1083 (새 탭)
   - 주문에 담긴 상품을 검색해서 '정답 상품'을 찾아 고객 주소로 주문
   - 모두 주문하면 TBA 배송번호가 발급됨 → 학생이 복사해 쇼피파이 [Mark as fulfilled] 에 붙여넣음
   - 가격은 상품 원가를 그대로 '아마존 가격'으로 표시 (판매가 = 아마존가 × (1+마진))
   ========================================================= */
(function () {
  var ORDERS = 'practice_orders';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function money(n) { return '$' + Number(n || 0).toFixed(2); }
  function h(s) { var n = 0; s = String(s); for (var i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) >>> 0; return n; }

  function loadOrders() { try { return JSON.parse(localStorage.getItem(ORDERS)) || []; } catch (e) { return []; } }
  function saveOrder(o) {
    var arr = loadOrders();
    var i = arr.findIndex(function (x) { return x.no === o.no; });
    if (i !== -1) { arr[i] = o; localStorage.setItem(ORDERS, JSON.stringify(arr)); }
  }

  var order = null, catalog = [], ordered = {};   // ordered: pid -> 주문 수량

  function imgsOf(p) {
    return (p.images && p.images.length) ? p.images : (p.image_url ? [p.image_url] : (p.image ? [p.image] : []));
  }
  function ratingOf(p) { return ((38 + h(p.id + 'r') % 12) / 10).toFixed(1); }   // 3.8 ~ 4.9
  function reviewsOf(p) { return 50 + h(p.id + 'v') % 4950; }
  function primeOf(p) { return h(p.id + 'p') % 10 < 8; }                          // 80% Prime
  function deliveryText(p) {
    var d = new Date(Date.now() + (2 + h(p.id) % 3) * 86400000);
    var wd = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
    return (d.getMonth() + 1) + '/' + d.getDate() + '(' + wd + ') 도착 예정';
  }
  function stars(r) {
    r = Number(r); var full = Math.floor(r), half = (r - full) >= 0.5;
    var s = '';
    for (var i = 0; i < 5; i++) s += (i < full ? '★' : (i === full && half ? '⯨' : '☆'));
    return s;
  }

  function neededMap() { var m = {}; (order.lines || []).forEach(function (l) { m[l.pid] = (m[l.pid] || 0) + l.qty; }); return m; }
  function isComplete() { var need = neededMap(); return Object.keys(need).every(function (pid) { return (ordered[pid] || 0) >= need[pid]; }); }
  function wrongCount() { var need = neededMap(); return Object.keys(ordered).filter(function (pid) { return !need[pid]; }).length; }

  function persist() {
    var complete = isComplete();
    var tracking = null;
    if (complete) {
      tracking = (order.amazon && order.amazon.tracking) || ('TBA' + String(h(order.no + 'tba') % 1000000000000).padStart(12, '0'));
    }
    order.amazon = { items: ordered, tracking: tracking, correct: complete && wrongCount() === 0, complete: complete, at: Date.now() };
    saveOrder(order);
  }

  /* ---------- 렌더 ---------- */
  function needList() {
    var need = neededMap();
    return (order.lines || []).map(function (l) {
      var done = (ordered[l.pid] || 0) >= l.qty;
      var img = (imgsOf(l)[0]) ? '<img src="' + esc(imgsOf(l)[0]) + '" alt="">' : '<span class="az-noimg">?</span>';
      return '<div class="az-need__item ' + (done ? 'is-done' : '') + '">' +
        '<span class="az-need__chk">' + (done ? '✅' : '⬜') + '</span>' +
        img +
        '<div class="az-need__info"><b>' + esc(l.name) + '</b><span>수량 ' + l.qty + '개</span></div>' +
        '</div>';
    }).join('');
  }

  function card(p) {
    var img = imgsOf(p)[0];
    return '<div class="az-card" data-pid="' + esc(p.id) + '">' +
      '<div class="az-card__img">' + (img ? '<img src="' + esc(img) + '" alt="">' : '<span class="az-noimg">?</span>') + '</div>' +
      '<div class="az-card__title">' + esc(p.name) + '</div>' +
      '<div class="az-card__rate"><span class="az-stars">' + stars(ratingOf(p)) + '</span> ' +
        '<span class="az-rate__n">' + ratingOf(p) + '</span> <span class="az-rev">(' + reviewsOf(p).toLocaleString() + ')</span></div>' +
      '<div class="az-card__price">' + money(p.cost) + '</div>' +
      (primeOf(p) ? '<div class="az-prime">✓prime <span>무료 배송</span></div>' : '<div class="az-ship">배송비 별도</div>') +
      '</div>';
  }

  function results(query) {
    var q = (query || '').trim().toLowerCase();
    var list = q ? catalog.filter(function (p) { return (p.name || '').toLowerCase().indexOf(q) !== -1; }) : catalog;
    if (!list.length) return '<div class="az-empty">검색 결과가 없습니다. 상품명을 확인해 다시 검색해 보세요.</div>';
    return '<div class="az-grid">' + list.map(card).join('') + '</div>';
  }

  function render() {
    var complete = order.amazon && order.amazon.complete;
    var addr = esc(order.city + ' ' + order.zip);

    var done = complete
      ? '<div class="az-done">' +
          '<div class="az-done__h">✅ 모든 상품을 아마존에서 주문했습니다</div>' +
          (order.amazon.correct ? '' : '<div class="az-done__warn">⚠️ 주문에 없는 상품도 담았습니다. 실제라면 오배송 손실이 발생합니다.</div>') +
          '<div class="az-tba">배송번호(Tracking)<b id="azTba">' + esc(order.amazon.tracking) + '</b>' +
            '<button class="btn-sm is-dark" id="azCopy">복사</button></div>' +
          '<div class="az-done__tip">이 번호를 복사해 쇼피파이 주문의 <b>[Mark as fulfilled]</b> 에 붙여넣으면 발주가 완료됩니다.</div>' +
          '<a class="btn-primary" href="order-detail.html?no=' + encodeURIComponent(order.no) + '" style="text-decoration:none;">← 쇼피파이 주문으로 돌아가기</a>' +
        '</div>'
      : '';

    document.getElementById('azRoot').innerHTML =
      '<div class="az-top">' +
        '<a class="az-logo" href="order-detail.html?no=' + encodeURIComponent(order.no) + '">amazon<span>.com</span></a>' +
        '<div class="az-deliver">📍 배송지: <b>' + addr + '</b></div>' +
      '</div>' +

      '<div class="az-need">' +
        '<div class="az-need__h">🛒 이 주문(' + esc(order.no) + ')에 필요한 상품 — 아마존에서 찾아 주문하세요</div>' +
        needList() +
      '</div>' +

      done +

      '<div class="az-searchbar">' +
        '<input type="text" id="azSearch" placeholder="상품명을 검색하세요 (예: ' + esc((order.lines[0] && order.lines[0].name || '').split(' ').slice(0, 2).join(' ')) + ')">' +
        '<button class="btn-primary" id="azSearchBtn">검색</button>' +
      '</div>' +
      '<div id="azResults">' + results('') + '</div>';

    var si = document.getElementById('azSearch');
    var run = function () { document.getElementById('azResults').innerHTML = results(si.value); };
    document.getElementById('azSearchBtn').addEventListener('click', run);
    si.addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
    si.addEventListener('input', run);

    document.getElementById('azResults').addEventListener('click', function (e) {
      var c = e.target.closest('.az-card'); if (!c) return;
      var p = catalog.find(function (x) { return String(x.id) === c.dataset.pid; });
      if (p) openProduct(p);
    });

    var cp = document.getElementById('azCopy');
    if (cp) cp.addEventListener('click', function () {
      var t = order.amazon.tracking;
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { cp.textContent = '복사됨!'; }, function () { cp.textContent = t; });
      else { cp.textContent = t; }
    });
  }

  function openProduct(p) {
    var need = neededMap();
    var defQty = need[p.id] || 1;
    var imgs = imgsOf(p);
    var big = imgs[0] ? '<img src="' + esc(imgs[0]) + '" alt="">' : '<span class="az-noimg">?</span>';
    var addr = esc(order.cust + ', ' + order.addr + ', ' + order.city + ' ' + order.zip);

    var box = document.createElement('div');
    box.className = 'modal-overlay is-open az-modal';
    box.innerHTML =
      '<div class="modal-card az-prod">' +
        '<div class="modal-card__head"><h3>' + esc(p.name) + '</h3><button class="modal-close" data-close>×</button></div>' +
        '<div class="modal-card__body">' +
          '<div class="az-prod__grid">' +
            '<div class="az-prod__img">' + big + '</div>' +
            '<div class="az-prod__info">' +
              '<div class="az-prod__rate"><span class="az-stars">' + stars(ratingOf(p)) + '</span> ' + ratingOf(p) +
                ' <span class="az-rev">(' + reviewsOf(p).toLocaleString() + '개 평가)</span></div>' +
              '<div class="az-prod__price">' + money(p.cost) + '</div>' +
              (primeOf(p) ? '<div class="az-prime">✓prime · 무료 배송</div>' : '<div class="az-ship">배송비 별도</div>') +
              '<div class="az-prod__deliver">🚚 ' + deliveryText(p) + '</div>' +
              '<div class="az-prod__ship-to">📍 Deliver to: <b>' + addr + '</b></div>' +
              '<div class="az-prod__qty">수량 <select id="azQty">' +
                [1, 2, 3, 4, 5].map(function (n) { return '<option' + (n === defQty ? ' selected' : '') + '>' + n + '</option>'; }).join('') +
              '</select></div>' +
              '<button class="btn-primary az-buy" id="azBuy">지금 구매 (Buy now)</button>' +
            '</div>' +
          '</div>' +
          '<div class="az-about"><b>상품 정보 (About this item)</b>' +
            '<ul><li>' + esc(p.name) + ' — 아마존 정품, 신속 배송</li>' +
            '<li>고품질 소재 · 실사용 리뷰 다수</li>' +
            '<li>30일 반품 보장</li></ul></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(box);
    box.addEventListener('click', function (ev) { if (ev.target === box || ev.target.closest('[data-close]')) box.remove(); });
    box.querySelector('#azBuy').addEventListener('click', function () {
      var qty = Number(box.querySelector('#azQty').value) || 1;
      ordered[p.id] = (ordered[p.id] || 0) + qty;
      persist();
      box.remove();
      render();
      window.scrollTo(0, 0);
    });
  }

  function notReady(msg) {
    document.getElementById('azRoot').innerHTML =
      '<div class="az-top"><span class="az-logo">amazon<span>.com</span></span></div>' +
      '<div class="az-need" style="text-align:center;color:#555;">' + msg +
      '<br><br><a class="btn-primary" href="order-practice.html" style="text-decoration:none;">발주 연습으로</a></div>';
  }

  (async function init() {
    var user = await Auth.require();
    if (!user) return;

    var no = new URLSearchParams(location.search).get('no');
    order = loadOrders().find(function (x) { return x.no === no; });
    if (!order) { notReady('주문을 찾을 수 없습니다.'); return; }

    // 카탈로그(같은 주제 상품들 = 검색 후보). 실패해도 주문 상품은 항상 담아둠.
    try {
      var s = await sb.from('practice_settings').select('topic').eq('user_id', user.id).maybeSingle();
      var topic = s.data && s.data.topic;
      if (topic) {
        var pr = await sb.from('products').select('*').eq('topic', topic).eq('active', true);
        catalog = pr.data || [];
      }
    } catch (e) {}

    // 주문에 담긴 상품이 카탈로그에 반드시 포함되도록 병합 (정답 상품이 검색되게)
    (order.lines || []).forEach(function (l) {
      if (!catalog.some(function (p) { return String(p.id) === String(l.pid); })) {
        catalog.push({ id: l.pid, name: l.name, cost: l.cost, images: l.images, image_url: l.image });
      }
    });

    // 이전 소싱 진행상황 복원
    if (order.amazon && order.amazon.items) ordered = order.amazon.items;

    render();
  })();
})();
