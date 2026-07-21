/* =========================================================
   시뮬 아마존 (드랍쉬핑 소싱 연습) — 함정 포함판
   - 주문의 각 상품마다 검색 결과에 정답 + 함정 리스팅을 생성:
     · 정답: 정확한 이름 · Amazon.com 발송 · Prime · 정상가
     · 바가지: 같은 상품인데 제3자 판매자 · 더 비쌈 (사면 원가↑)
     · 유사품: 이름 변형(제네릭/호환) · 쌈 (사면 오배송)
   - 옵션(색상/사이즈)이 있는 상품은 맞는 옵션을 골라야 함 (틀리면 오배송)
   - 품절(oos) 주문은 모든 리스팅이 재고 없음 → 주문 불가 → 환불해야 함
   - 소싱 결과(실제 지출·오배송·바가지)는 order.amazon 에 기록 → 정산에 반영
   ========================================================= */
(function () {
  var ORDERS = 'practice_orders';
  var SELLERS = ['QuickMart US', 'ShopVelocity', 'PrimeDeals Co', 'ValueBridge', 'NovaGoods'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function money(n) { return '$' + Number(n || 0).toFixed(2); }
  function round2(n) { return Math.round(n * 100) / 100; }
  function h(s) { var n = 0; s = String(s); for (var i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) >>> 0; return n; }

  function loadOrders() { try { return JSON.parse(localStorage.getItem(ORDERS)) || []; } catch (e) { return []; } }
  function saveOrder(o) {
    var arr = loadOrders();
    var i = arr.findIndex(function (x) { return x.no === o.no; });
    if (i !== -1) { arr[i] = o; localStorage.setItem(ORDERS, JSON.stringify(arr)); }
  }

  // 결정적 옵션 (order-detail.js 의 optionOf 와 반드시 동일 로직!)
  function optionOf(no, line, level) {
    if (line.oos) return null;
    var seed = h(no + line.pid + 'opt');
    var pth = level === '상' ? 6 : level === '하' ? 2 : 4;   // 옵션 빈도: 하 20% / 중 40% / 상 60%
    if (seed % 10 >= pth) return null;
    var TYPES = [
      { label: '색상', choices: ['블랙', '화이트', '블루', '레드', '그린'] },
      { label: '사이즈', choices: ['S', 'M', 'L', 'XL'] },
      { label: '용량', choices: ['소형', '중형', '대형'] }
    ];
    var t = TYPES[seed % TYPES.length];
    return { label: t.label, choices: t.choices, correct: t.choices[Math.floor(seed / 7) % t.choices.length] };
  }
  function lineOos(l) { return !!l.oos; }

  var order = null, catalog = [], listings = [], bought = {};

  function imgsOf(p) { return (p.images && p.images.length) ? p.images : (p.image_url ? [p.image_url] : (p.image ? [p.image] : [])); }
  function ratingOf(p) { return ((38 + h(p.lid + 'r') % 12) / 10).toFixed(1); }
  function reviewsOf(p) { return 50 + h(p.lid + 'v') % 4950; }
  function deliveryText(p) {
    var extra = p.slow ? (12 + h(p.lid) % 8) : p.prime ? (2 + h(p.lid) % 2) : (5 + h(p.lid) % 4);
    var d = new Date(Date.now() + extra * 86400000);
    var wd = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
    return (d.getMonth() + 1) + '/' + d.getDate() + '(' + wd + ') 도착 예정';
  }
  function stars(r) { r = Number(r); var f = Math.floor(r), hf = (r - f) >= 0.5, s = ''; for (var i = 0; i < 5; i++) s += (i < f ? '★' : (i === f && hf ? '⯨' : '☆')); return s; }

  function lineByPid(pid) { return (order.lines || []).find(function (l) { return String(l.pid) === String(pid); }); }
  function neededMap() { var m = {}; (order.lines || []).forEach(function (l) { m[l.pid] = (m[l.pid] || 0) + l.qty; }); return m; }
  function isComplete() { var need = neededMap(); return Object.keys(need).every(function (pid) { return bought[pid]; }); }
  function anyOos() { return (order.lines || []).some(lineOos); }

  function buildListings() {
    listings = [];
    var inOrder = {};
    var lv = order.level || '중';                    // 생성 당시 난이도
    (order.lines || []).forEach(function (l) {
      var C = Number(l.cost) || 0;
      var seed = h(order.no + l.pid);
      var oosType = l.oos ? (l.oosType || 'stock') : null;
      inOrder[l.pid] = true;
      if (oosType === 'notfound') return;              // 단종: 검색 결과에 아예 안 뜸
      var inStock = oosType !== 'stock';               // 품절이면 재고 없음
      // 옵션: 정상은 optionOf, oos-option 은 요청 옵션을 뺀 선택지(정답 없음)
      var baseOpt;
      if (oosType === 'option' && l.reqOption) {
        baseOpt = { label: l.reqOption.label, choices: l.reqOption.choices.filter(function (c) { return c !== l.reqOption.value; }), correct: '__none__' };
      } else {
        baseOpt = optionOf(order.no, l, lv);
      }
      // 같은 제품이라도 리스팅마다 옵션이 있기도/없기도 하다 (정답 리스팅은 항상 옵션 있음)
      function optFor(lid, always) {
        if (!baseOpt) return null;
        if (always) return baseOpt;
        return (h(lid + 'op') % 10 < 5) ? baseOpt : null;
      }
      // 정답
      listings.push({ lid: l.pid + '-ok', pid: l.pid, kind: 'correct', name: l.name, images: l.images || [], image: l.image,
        price: C, seller: 'Amazon.com', prime: true, inStock: inStock, option: optFor(l.pid + '-ok', true) });
      // 바가지 (하=확 비쌈/티남, 상=가격차 작아 헷갈림)
      var hiMul = lv === '상' ? (1.10 + (seed % 12) / 100) : lv === '하' ? (1.30 + (seed % 20) / 100) : (1.18 + (seed % 22) / 100);
      listings.push({ lid: l.pid + '-hi', pid: l.pid, kind: 'overpriced', name: l.name, images: l.images || [], image: l.image,
        price: round2(C * hiMul), seller: SELLERS[seed % SELLERS.length], prime: false, inStock: inStock, option: optFor(l.pid + '-hi') });
      // 유사품 (하 난이도는 생략, 중/상만)
      if (lv !== '하') {
        listings.push({ lid: l.pid + '-cf', pid: l.pid, kind: 'counterfeit', name: l.name + ' (제네릭/호환)', images: l.images || [], image: l.image,
          price: round2(C * (0.65 + (seed % 20) / 100)), seller: SELLERS[(seed + 2) % SELLERS.length], prime: false, inStock: inStock, option: optFor(l.pid + '-cf') });
      }
      // 상 난이도는 유사품 하나 더
      if (lv === '상') {
        listings.push({ lid: l.pid + '-cf2', pid: l.pid, kind: 'counterfeit', name: l.name + ' (호환형)', images: l.images || [], image: l.image,
          price: round2(C * (0.72 + (seed % 15) / 100)), seller: SELLERS[(seed + 3) % SELLERS.length], prime: false, inStock: inStock, option: optFor(l.pid + '-cf2') });
      }
      // 저가·느린 배송 (같은 상품이지만 배송이 오래 걸림 → 나중에 '배송 지연' 위험)
      if (inStock) {
        listings.push({ lid: l.pid + '-slow', pid: l.pid, kind: 'slow', name: l.name + ' (해외직배송)', images: l.images || [], image: l.image,
          price: round2(C * (0.80 + (seed % 12) / 100)), seller: SELLERS[(seed + 4) % SELLERS.length], prime: false, slow: true, inStock: true, option: optFor(l.pid + '-slow') });
      }
    });
    (catalog || []).forEach(function (p) {
      if (inOrder[p.id]) return;
      listings.push({ lid: 'f-' + p.id, pid: p.id, kind: 'filler', name: p.name, images: p.images || [], image: p.image_url,
        price: Number(p.cost) || 0, seller: 'Amazon.com', prime: h(p.id) % 3 !== 0, inStock: true, option: null });
    });
  }

  function persist() {
    var complete = isComplete();
    var pids = Object.keys(bought);
    var sourcedCost = pids.reduce(function (a, p) { return a + (bought[p].lineCost || 0); }, 0);
    var misship = pids.some(function (p) { return bought[p].wrongProduct || bought[p].wrongOption; });
    var overpaid = pids.reduce(function (a, p) { return a + (bought[p].overpaid || 0); }, 0);
    var tracking = complete ? ((order.amazon && order.amazon.tracking) || ('TBA' + String(h(order.no + 'tba') % 1000000000000).padStart(12, '0'))) : null;
    order.amazon = {
      purchases: bought, complete: complete, tracking: tracking,
      sourcedCost: round2(sourcedCost), misship: misship, overpaid: round2(overpaid),
      slowShip: pids.some(function (p) { return bought[p].slow; }),
      unavailable: anyOos(), correct: complete && !misship && overpaid < 0.005, at: Date.now()
    };
    saveOrder(order);
  }

  // 난이도 하에서 잘못/비효율 선택 시 담기 전에 보여줄 경고 (없으면 null)
  function warnMsg(L, isFiller, wrongProduct, wrongOption) {
    if (isFiller) return '이 상품은 고객이 주문한 상품이 아닙니다.\n검색해서 정확한 상품을 담으세요.';
    if (wrongProduct) return '유사품(제네릭/호환)입니다.\n정확한 정품 상품을 담으세요.';
    if (wrongOption) return '고객이 요청한 옵션과 맞지 않습니다.\n요청 옵션이 있는 리스팅에서 맞는 옵션을 선택하세요.';
    if (L.kind === 'overpriced') return '더 비싼 리스팅(제3자 판매)입니다.\n정상가(Amazon.com 발송)를 담으세요.';
    if (L.slow) return '배송이 느린 리스팅입니다.\n배송 빠른(Prime) 리스팅을 담으세요.';
    return null;
  }

  function buy(L, qty, selOpt) {
    if (!L.inStock) return;
    var fb = order.level || '중';
    var targetPid = L.pid;
    var isFiller = L.kind === 'filler';
    var wrongProduct = L.kind === 'counterfeit';
    if (isFiller) {
      // 주문에 없는 '비슷한' 상품도 담을 수 있음 → 미해결 라인에 오배송으로 귀속
      targetPid = Object.keys(neededMap()).filter(function (pid) { return !bought[pid]; })[0];
      if (!targetPid) { alert('이 주문에 필요한 상품은 이미 모두 담았습니다.'); return; }
      wrongProduct = true;
    }
    var line = lineByPid(targetPid);
    var C = (line || {}).cost || 0;
    // 이 라인이 특정 옵션(색상/사이즈)을 필요로 하나?
    var lineOpt = line ? (optionOf(order.no, line, order.level) || (line.reqOption ? { correct: line.reqOption.value } : null)) : null;
    var wrongOption = false;
    if (lineOpt) {
      if (!L.option) wrongOption = true;                     // 옵션 없는 리스팅으로 삼 → 변형 지정 못함
      else if (selOpt !== L.option.correct) wrongOption = true;
    }

    // 난이도 하: 잘못/비효율 선택은 담기 전에 경고하고 막는다
    if (fb === '하') {
      var w = warnMsg(L, isFiller, wrongProduct, wrongOption);
      if (w) { alert(w); return; }
    }

    bought[targetPid] = {
      kind: L.kind, unit: L.price, qty: qty, lineCost: round2(L.price * qty),
      wrongProduct: wrongProduct, wrongOption: wrongOption,
      overpaid: L.kind === 'overpriced' ? round2((L.price - C) * qty) : 0,
      slow: !!L.slow,
      name: L.name
    };
    persist();
    render();
    window.scrollTo(0, 0);
  }

  /* ---------- 렌더 ---------- */
  function boughtLabel(rec) {
    if (!rec) return '';
    if ((order.level || '중') === '상') return '<span class="az-ok">담음</span>';   // 상: 실수 힌트 없음
    if (rec.wrongProduct) return '<span class="az-bad">⚠️ 유사품 · 오배송</span>';
    if (rec.wrongOption) return '<span class="az-bad">⚠️ 옵션 틀림 · 오배송</span>';
    if (rec.overpaid > 0) return '<span class="az-warn">⚠️ 바가지 (+' + money(rec.overpaid) + ')</span>';
    if (rec.slow) return '<span class="az-warn">🐢 저가·느린 배송 (지연 위험)</span>';
    return '<span class="az-ok">정상 주문</span>';
  }

  function needList() {
    return (order.lines || []).map(function (l) {
      var rec = bought[l.pid];
      var done = !!rec;
      var op = optionOf(order.no, l, order.level);
      var optLabel = op ? op.label : (l.reqOption ? l.reqOption.label : null);
      var optVal = op ? op.correct : (l.reqOption ? l.reqOption.value : null);
      var img = (imgsOf(l)[0]) ? '<img src="' + esc(imgsOf(l)[0]) + '" alt="">' : '<span class="az-noimg">?</span>';
      // 품절/단종 여부는 표시하지 않음 — 학생이 검색해서 직접 확인
      var status = done ? boughtLabel(rec) : '<span class="az-todo">담아야 함</span>';
      return '<div class="az-need__item ' + (done ? 'is-done' : '') + '">' +
        '<span class="az-need__chk">' + (done ? '✅' : '⬜') + '</span>' + img +
        '<div class="az-need__info"><b>' + esc(l.name) + '</b>' +
          '<span>수량 ' + l.qty + '개' + (optLabel ? ' · ' + esc(optLabel) + ': <b>' + esc(optVal) + '</b>' : '') + '</span>' +
          '<span class="az-need__st">' + status + '</span>' +
        '</div></div>';
    }).join('');
  }

  function card(L) {
    var img = imgsOf(L)[0];
    var badge = !L.inStock ? '<div class="az-oosbadge">현재 재고 없음</div>' : '';
    return '<div class="az-card' + (!L.inStock ? ' is-oos' : '') + '" data-lid="' + esc(L.lid) + '">' +
      '<div class="az-card__img">' + (img ? '<img src="' + esc(img) + '" alt="">' : '<span class="az-noimg">?</span>') + badge + '</div>' +
      '<div class="az-card__title">' + esc(L.name) + '</div>' +
      '<div class="az-card__rate"><span class="az-stars">' + stars(ratingOf(L)) + '</span> ' +
        '<span class="az-rate__n">' + ratingOf(L) + '</span> <span class="az-rev">(' + reviewsOf(L).toLocaleString() + ')</span></div>' +
      '<div class="az-card__price">' + money(L.price) + '</div>' +
      '<div class="az-seller">판매자: ' + esc(L.seller) + '</div>' +
      (L.slow ? '<div class="az-slow">🐢 장기 해외배송 (지연)</div>' : L.prime ? '<div class="az-prime">✓prime <span>무료·빠른 배송</span></div>' : '<div class="az-ship">일반 배송</div>') +
      '</div>';
  }

  function results(query) {
    var q = (query || '').trim().toLowerCase();
    var list = q ? listings.filter(function (L) { return (L.name || '').toLowerCase().indexOf(q) !== -1; }) : listings;
    if (!list.length) return '<div class="az-empty">검색 결과가 없습니다.</div>';
    return '<div class="az-grid">' + list.map(card).join('') + '</div>';
  }

  function render() {
    var complete = order.amazon && order.amazon.complete;
    var oos = anyOos();
    var addr = esc(order.city + ' ' + order.zip);

    var done = '';
    if (complete) {
      done = '<div class="az-done">' +
        '<div class="az-done__h">✅ 모든 상품을 아마존에서 주문했습니다</div>' +
        (order.amazon.correct ? '' : '<div class="az-done__warn">⚠️ 잘못 소싱한 상품이 있습니다(오배송/바가지). 실제라면 손실이 발생합니다.</div>') +
        '<div class="az-tba">배송번호(Tracking)<b id="azTba">' + esc(order.amazon.tracking) + '</b><button class="btn-sm is-dark" id="azCopy">복사</button></div>' +
        '<div class="az-done__tip">이 번호를 복사해 쇼피파이 주문의 <b>[Mark as fulfilled]</b> 에 붙여넣으면 발주가 완료됩니다.</div>' +
        '<a class="btn-primary" href="order-detail.html?no=' + encodeURIComponent(order.no) + '" style="text-decoration:none;">← 쇼피파이 주문으로 돌아가기</a>' +
      '</div>';
    }
    // 품절/단종/옵션없음은 배너로 알려주지 않는다 — 학생이 검색·상품페이지에서 직접 판단해야 함

    document.getElementById('azRoot').innerHTML =
      '<div class="az-top">' +
        '<a class="az-logo" href="order-detail.html?no=' + encodeURIComponent(order.no) + '">amazon<span>.com</span></a>' +
        '<div class="az-deliver">📍 배송지: <b>' + addr + '</b></div>' +
      '</div>' +
      '<div class="az-need">' +
        '<div class="az-need__h">🛒 이 주문(' + esc(order.no) + ')에 필요한 상품 — 정확한 리스팅을 찾아 주문하세요</div>' +
        needList() +
      '</div>' +
      done +
      '<div class="az-searchbar">' +
        '<input type="text" id="azSearch" placeholder="상품명을 검색하세요">' +
        '<button class="btn-primary" id="azSearchBtn">검색</button>' +
      '</div>' +
      '<div id="azResults">' + results('') + '</div>';

    var si = document.getElementById('azSearch');
    var run = function () { document.getElementById('azResults').innerHTML = results(si.value); };
    document.getElementById('azSearchBtn').addEventListener('click', run);
    si.addEventListener('input', run);
    si.addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });

    document.getElementById('azResults').addEventListener('click', function (e) {
      var c = e.target.closest('.az-card'); if (!c) return;
      var L = listings.find(function (x) { return x.lid === c.dataset.lid; });
      if (L) openProduct(L);
    });

    var cp = document.getElementById('azCopy');
    if (cp) cp.addEventListener('click', function () {
      var t = order.amazon.tracking;
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { cp.textContent = '복사됨!'; }, function () { cp.textContent = t; });
      else cp.textContent = t;
    });
  }

  function openProduct(L) {
    var need = neededMap();
    var defQty = need[L.pid] || 1;
    var big = imgsOf(L)[0] ? '<img src="' + esc(imgsOf(L)[0]) + '" alt="">' : '<span class="az-noimg">?</span>';
    var addr = esc(order.cust + ', ' + order.addr + ', ' + order.city + ' ' + order.zip);

    var box = document.createElement('div');
    box.className = 'modal-overlay is-open az-modal';
    box.innerHTML =
      '<div class="modal-card az-prod">' +
        '<div class="modal-card__head"><h3>' + esc(L.name) + '</h3><button class="modal-close" data-close>×</button></div>' +
        '<div class="modal-card__body">' +
          '<div class="az-prod__grid">' +
            '<div class="az-prod__img">' + big + '</div>' +
            '<div class="az-prod__info">' +
              '<div class="az-prod__rate"><span class="az-stars">' + stars(ratingOf(L)) + '</span> ' + ratingOf(L) +
                ' <span class="az-rev">(' + reviewsOf(L).toLocaleString() + '개 평가)</span></div>' +
              '<div class="az-prod__price">' + money(L.price) + '</div>' +
              '<div class="az-seller">판매자: <b>' + esc(L.seller) + '</b></div>' +
              (L.slow ? '<div class="az-slow">🐢 장기 해외배송 — 배송이 오래 걸립니다</div>' : L.prime ? '<div class="az-prime">✓prime · 무료 배송</div>' : '<div class="az-ship">일반 배송(제3자 판매)</div>') +
              '<div class="az-prod__deliver' + (L.slow ? ' is-slow' : '') + '">🚚 ' + deliveryText(L) + '</div>' +
              (L.inStock ? '' : '<div class="az-prod__oos">현재 재고 없음 (Currently unavailable)</div>') +
              '<div class="az-prod__ship-to">📍 Deliver to: <b>' + addr + '</b></div>' +
              (L.option ? '<div class="az-prod__opt"><b>' + esc(L.option.label) + '</b> <select id="azOpt"><option value="">선택하세요</option>' +
                L.option.choices.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('') + '</select></div>' : '') +
              '<div class="az-prod__qty">수량 <select id="azQty">' +
                [1, 2, 3, 4, 5].map(function (n) { return '<option' + (n === defQty ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></div>' +
              (L.inStock
                ? '<button class="btn-primary az-buy" id="azBuy">지금 구매 (Buy now)</button>'
                : '<button class="btn-primary az-buy" disabled style="opacity:.5;cursor:not-allowed;">품절 — 주문 불가</button>') +
            '</div>' +
          '</div>' +
          '<div class="az-about"><b>상품 정보 (About this item)</b>' +
            '<ul><li>' + esc(L.name) + '</li><li>고품질 소재 · 실사용 리뷰 다수</li><li>30일 반품 보장</li></ul></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(box);
    box.addEventListener('click', function (ev) { if (ev.target === box || ev.target.closest('[data-close]')) box.remove(); });
    var buyBtn = box.querySelector('#azBuy');
    if (buyBtn && L.inStock) buyBtn.addEventListener('click', function () {
      var qty = Number(box.querySelector('#azQty').value) || 1;
      var selOpt = box.querySelector('#azOpt') ? box.querySelector('#azOpt').value : null;
      if (L.option && !selOpt) { alert('옵션(' + L.option.label + ')을 선택하세요.'); return; }
      buy(L, qty, selOpt);
      box.remove();
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

    try {
      var s = await sb.from('practice_settings').select('topic').eq('user_id', user.id).maybeSingle();
      var topic = s.data && s.data.topic;
      if (topic) { var pr = await sb.from('products').select('*').eq('topic', topic).eq('active', true); catalog = pr.data || []; }
    } catch (e) {}

    if (order.amazon && order.amazon.purchases) bought = order.amazon.purchases;
    buildListings();
    persist();     // 방문 시점에 소싱 상태(품절/단종/옵션없음 포함) 기록 → 주문 상세에 반영
    render();
  })();
})();
