/* =========================================================
   발주 연습하기 — 주문 목록 (쇼피파이 스타일)

   [흐름]
   1) 발주 연습 세팅(order-setup.html)에서 주제·마진·주문건수·난이도를 저장
   2) 이 화면에 처음 들어오면 그 세팅으로 "주문 시나리오" 전체(N건)를 한 번에 생성해 둠
      → 사기 주문 비율 규칙(10건당 최소 n건, 전체의 x% 미만)을 지키려면
        주문을 하나씩 랜덤으로 뽑아선 안 되고 전체를 미리 계획해야 함
   3) [주문 받기] 를 누를 때마다 시나리오에서 1~4건씩 '지금 시각'으로 공개
   4) 예정된 N건을 다 받으면 더 이상 주문이 들어오지 않음 → 정산(다음 단계)

   [금액]
   판매가 = 아마존 원가 × (1 + 마진/100)
   함정(역마진) 주문은 설정 마진 대신 아주 낮거나 음수인 마진이 적용됨 → 팔수록 손해

   [문제 주문 = issue] — 난이도 비율(15/25/35%)로 총량이 통제되는 '사기 주문' 4종
   chargeback   : 사기 결제 — 발주하면 차지백 맞음. 걸러야 정답
   oos          : 제품 없음(품절/단종) — 발주 불가, 고객 환불 처리
   missing_info : 정보 누락 (전화번호/주소/우편번호가 빔) — 고객 문의 후 처리
   no_ship      : 배송 불가 지역 (알래스카·하와이·APO 등)

   [별도 함정]
   lowMargin : 역마진/무마진 주문 — 사기는 아니라서 발주는 해야 하지만 팔수록 손해.
               사기 비율과 무관하게 별도 확률로 섞임

   TODO: 주문 상세/발주 처리 화면, 처리 결과에 따른 정산·성적
   ========================================================= */
(function () {
  var ORDERS = 'practice_orders';   // 이미 공개된(받은) 주문
  var PLAN = 'practice_plan';       // 아직 공개되지 않은 주문 + 시나리오 서명

  /* ---------- 난이도별 함정 비율 ----------
     fraud/minPer10/fraudCap = 사기(문제) 주문 규칙 — 확정된 값
     lowMargin = 역마진 확률 (별도 카운트) — 잠정값이니 필요하면 이 숫자만 고치면 됨 */
  var LEVELS = {
    '하': { fraud: 0.15, minPer10: 1, fraudCap: 0.30, lowMargin: 0.05, notFound: 0.04 },
    '중': { fraud: 0.25, minPer10: 2, fraudCap: 0.35, lowMargin: 0.10, notFound: 0.07 },
    '상': { fraud: 0.35, minPer10: 3, fraudCap: 0.45, lowMargin: 0.15, notFound: 0.10 },
  };

  // 사기(문제) 주문 4종 — 위 fraud 비율 안에서 고르게 섞임
  var ISSUES = ['chargeback', 'oos', 'missing_info', 'no_ship'];

  // 배송 불가/고비용 지역
  var NO_SHIP = [['Anchorage','AK'],['Honolulu','HI'],['Juneau','AK'],['San Juan','PR'],['APO','AE'],['FPO','AP']];

  var MAIL = ['gmail.com', 'yahoo.com', 'sbcglobal.net', 'outlook.com', 'aol.com', 'icloud.com'];
  var SHIP_FEE = { Economy: 4.90, Standard: 7.90, Express: 14.90 };
  var TAX_RATE = 0.0825;

  var FIRST = ['James','Mary','Robert','Patricia','John','Jennifer','Michael','Linda','David','Elizabeth',
    'William','Barbara','Richard','Susan','Joseph','Jessica','Thomas','Sarah','Charles','Karen',
    'Christopher','Nancy','Daniel','Lisa','Matthew','Betty','Anthony','Sandra','Mark','Ashley',
    'Donald','Kimberly','Steven','Emily','Paul','Donna','Andrew','Michelle','Joshua','Carol'];
  var LAST = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez','Martinez',
    'Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor','Moore','Jackson','Martin',
    'Lee','Perez','Thompson','White','Harris','Sanchez','Clark','Ramirez','Lewis','Robinson',
    'Walker','Young','Allen','King','Wright','Scott','Torres','Nguyen','Hill','Flores'];
  var STREETS = ['Maple St','Oak Ave','Pine Rd','Cedar Ln','Elm St','Sunset Blvd','Lake Dr','Hill Rd'];
  var CITIES = [['Austin','TX'],['Denver','CO'],['Seattle','WA'],['Miami','FL'],['Boston','MA'],
    ['Phoenix','AZ'],['Portland','OR'],['Atlanta','GA'],['Chicago','IL'],['Dallas','TX']];
  var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  var settings = null;   // practice_settings 한 행
  var catalog = [];      // 선택한 주제의 상품들
  var orders = [];       // 받은 주문 (최신이 위)
  var plan = null;       // { sig, queue: [...아직 안 받은 주문], total, nextNo }

  function rand(a) { return a[Math.floor(Math.random() * a.length)]; }
  function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
  function round2(n) { return Math.round(n * 100) / 100; }
  function randName() { return rand(FIRST) + ' ' + rand(LAST); }
  function randPhone() {
    return '+1 (' + randInt(200, 989) + ') ' + randInt(200, 999) + '-' +
      String(randInt(0, 9999)).padStart(4, '0');
  }
  function fmtOrderTime(d) {
    var h = d.getHours(), ampm = h >= 12 ? 'pm' : 'am', h12 = h % 12 || 12;
    var mm = String(d.getMinutes()).padStart(2, '0');
    return MONTHS[d.getMonth()] + ' ' + d.getDate() + ' at ' + h12 + ':' + mm + ' ' + ampm;
  }

  // 배열을 섞음 (사기 4종을 고르게 배분할 때 사용)
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ---------- 사기 주문을 몇 번째 주문에 배치할지 계획 ----------
     규칙: 10건 묶음마다 최소 minPer10 건 / 전체 사기 비율은 fraudCap 미만 / 목표치는 fraud 확률
     반환: 사기 주문인 인덱스 Set */
  function planFraudSlots(n, lv) {
    var windows = [];               // [{start, size}] — 10건씩 묶음 (마지막은 나머지)
    for (var s = 0; s < n; s += 10) windows.push({ start: s, size: Math.min(10, n - s) });

    var minTotal = windows.reduce(function (a, w) { return a + Math.min(lv.minPer10, w.size); }, 0);
    var maxTotal = Math.max(minTotal, Math.ceil(n * lv.fraudCap) - 1);   // "x% 이상이면 안 됨" → 미만
    // 목표치에 ±2 흔들림을 줌 (매번 같은 건수면 "몇 건만 찾으면 끝"이라고 외워버림)
    var target = Math.round(n * lv.fraud) + randInt(-2, 2);
    var total = Math.min(Math.max(target, minTotal), Math.min(maxTotal, n));

    // 묶음마다 최소치를 먼저 채우고, 남는 건수는 여유 있는 묶음에 랜덤 배분
    var quota = windows.map(function (w) { return Math.min(lv.minPer10, w.size); });
    var left = total - quota.reduce(function (a, b) { return a + b; }, 0);
    while (left > 0) {
      var open = [];
      windows.forEach(function (w, i) { if (quota[i] < w.size) open.push(i); });
      if (!open.length) break;
      quota[rand(open)]++;
      left--;
    }

    var slots = {};
    windows.forEach(function (w, i) {
      var pool = [];
      for (var k = 0; k < w.size; k++) pool.push(w.start + k);
      for (var q = 0; q < quota[i]; q++) {
        slots[pool.splice(Math.floor(Math.random() * pool.length), 1)[0]] = true;
      }
    });
    return slots;
  }

  // 아마존 ASIN 같은 상품 코드 (주문 상세 화면에 표시)
  function randSku() {
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var s = 'B0';
    for (var i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }
  function emailOf(name) {
    return name.toLowerCase().replace(/[^a-z]/g, '') + '@' + rand(MAIL);
  }

  /* 주문 하나에 담기는 상품 개수(items) 분포 — 실제로는 1개짜리 주문이 대부분이다
     1개 70% / 2개 15% / 3개 10% / 4개 이상 5% */
  function rollItemCount() {
    var r = Math.random();
    if (r < 0.70) return 1;
    if (r < 0.85) return 2;
    if (r < 0.95) return 3;
    return randInt(4, 6);
  }

  // 주문 한 건의 상품 라인 구성 — 총 개수를 먼저 뽑고 상품들에 나눠 담는다
  function pickLines(marginPct) {
    var pool = catalog.slice();
    var total = rollItemCount();

    // 몇 종류로 나눌지: 같은 상품 여러 개일 수도, 서로 다른 상품일 수도 있다
    var kinds = 1;
    if (total > 1) kinds = Math.min(total, randInt(1, 3));
    kinds = Math.min(kinds, pool.length);

    // 각 종류에 1개씩 배정하고, 남은 개수를 무작위로 더 얹는다
    var qtys = [];
    for (var k = 0; k < kinds; k++) qtys.push(1);
    for (var left = total - kinds; left > 0; left--) qtys[randInt(0, kinds - 1)]++;

    var lines = [];
    for (var i = 0; i < kinds; i++) {
      var p = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      var cost = Number(p.cost) || 0;
      var imgs = (p.images && p.images.length) ? p.images : (p.image_url ? [p.image_url] : []);
      lines.push({
        pid: p.id,
        name: p.name,
        image: imgs[0] || '',    // 목록 썸네일용 대표 사진
        images: imgs,            // 상세 화면에서 넘겨볼 전체 사진
        sku: randSku(),
        source: p.source_url || '',
        cost: cost,
        price: round2(cost * (1 + marginPct / 100)),   // 판매가 = 원가 × (1 + 마진/100)
        qty: qtys[i]
      });
    }
    return lines;
  }

  /* 쇼피파이의 Order risk — 사기 주문일수록 높게 나오지만 100% 정답표는 아니다.
     (정상인데 Medium이 뜨기도 하고, 사기인데 Low로 깔리기도 함 → 리스크만 보고 판단하면 틀림) */
  function riskOf(o) {
    var r = Math.random();
    if (o.issue === 'chargeback') return r < 0.55 ? 'high' : (r < 0.85 ? 'medium' : 'low');
    return r < 0.82 ? 'low' : (r < 0.97 ? 'medium' : 'high');
  }

  // 사기 슬롯마다 어떤 종류의 문제를 넣을지 — 4종이 고르게 나오도록 섞어서 순서대로 배정.
  // 단, 차지백(핵심 학습 함정)은 사기 주문이 1건이라도 있으면 반드시 최소 1건 포함시킨다.
  function assignIssueTypes(slotCount) {
    if (slotCount <= 0) return [];
    var out = [];
    while (out.length < slotCount) out = out.concat(shuffle(ISSUES.slice()));
    out = out.slice(0, slotCount);
    if (out.indexOf('chargeback') === -1) out[randInt(0, slotCount - 1)] = 'chargeback';
    return out;
  }

  // N건 시나리오 생성 (아직 시각은 없음 — 받을 때 찍힘)
  function buildPlan(sig) {
    var lv = LEVELS[settings.level] || LEVELS['중'];
    var n = settings.order_count;
    var fraudSlots = planFraudSlots(n, lv);
    var issueTypes = assignIssueTypes(Object.keys(fraudSlots).length);
    var issueAt = 0;
    var baseMargin = Number(settings.margin) || 0;
    var no = 1001;
    var used = [];
    var queue = [];

    for (var i = 0; i < n; i++) {
      // 역마진 함정: 설정 마진 대신 거의 없거나 음수인 마진 적용
      var lowMargin = Math.random() < lv.lowMargin;
      var marginPct = lowMargin ? randInt(-15, 3) : baseMargin;
      var lines = pickLines(marginPct);

      var name = randName();
      for (var t = 0; t < 15 && used.indexOf(name) !== -1; t++) name = randName();
      used.push(name);

      var city = rand(CITIES);
      var o = {
        no: '#' + (no++),
        cust: name,
        billTo: name,                      // 청구지 명의 — 배송지 이름과 다르면 차지백 단서
        phone: randPhone(),
        addr: randInt(100, 9999) + ' ' + rand(STREETS),
        city: city[0] + ', ' + city[1],
        zip: String(randInt(10000, 99999)),
        channel: Math.random() < 0.3 ? 'Online Store' : 'Shop',
        lines: lines,
        items: lines.reduce(function (a, l) { return a + l.qty; }, 0),
        total: round2(lines.reduce(function (a, l) { return a + l.price * l.qty; }, 0)),  // 매출
        cost: round2(lines.reduce(function (a, l) { return a + l.cost * l.qty; }, 0)),    // 원가 합
        marginPct: marginPct,
        payment: 'paid',
        fulfillment: 'unfulfilled',
        method: rand(['Economy', 'Economy', 'Standard', 'Express']),
        issue: fraudSlots[i] ? issueTypes[issueAt++] : null,   // 사기(문제) 주문 4종 중 하나
        lowMargin: lowMargin,                                   // 역마진 — 사기와 별개
        level: settings.level,                                  // 생성 당시 난이도 (아마존 함정·옵션 빈도에 사용)
        missing: []
      };

      applyIssue(o);

      // 아마존 조회 불가(단종) — 사기/문제 쿼터와 별개로 일부 정상 주문에도 발생
      if (!o.issue && Math.random() < lv.notFound) {
        o.issue = 'oos';
        var nfl = o.lines[randInt(0, o.lines.length - 1)];
        nfl.oos = true; nfl.oosType = 'notfound'; nfl.stock = 0;
        o.reply = 'refund_all'; o.replied = false;
      }

      // 선물 주문 등 정상인데도 청구지 명의가 다른 경우 (차지백 단서가 100% 확정이 되지 않도록)
      if (!o.issue && Math.random() < 0.05) o.billTo = randName();

      // 주문 상세 화면에 필요한 값들 (배송비·세금·결제 총액·리스크)
      o.email = emailOf(o.cust);
      o.shipping = SHIP_FEE[o.method] || 4.90;
      o.tax = round2(o.total * TAX_RATE);
      o.grandTotal = round2(o.total + o.shipping + o.tax);   // 고객이 실제로 결제한 금액
      o.risk = riskOf(o);
      o.custOrderNo = Math.random() < 0.55 ? 1 : randInt(2, 4);   // 이 고객의 몇 번째 주문인지
      o.gateway = Math.random() < 0.5 ? 'PayPal Wallet' : 'Shop Pay';

      queue.push(o);
    }
    return { sig: sig, queue: queue, total: n, nextNo: no };
  }

  // 문제 주문의 실제 흔적을 데이터에 심는다 (수강생은 이 흔적을 보고 판단해야 함)
  function applyIssue(o) {
    if (o.issue === 'chargeback') {
      // 사기 결제 단서: 청구지 명의 불일치 + 급행배송 + 고액
      o.billTo = randName();
      o.method = 'Express';
      return;
    }
    if (o.issue === 'oos') {
      /* 아마존에서 소싱할 때 발견되는 '상품 없음' 3종.
         - stock    : 검색엔 뜨는데 품절(재고 없음)
         - notfound : 단종 — 검색해도 안 나옴
         - option   : 상품은 있으나 고객이 요청한 옵션이 없음
         → 어느 경우든 발송 불가 → 고객에게 안내 메일 보내고 환불해야 함. */
      var l = o.lines[randInt(0, o.lines.length - 1)];
      l.oos = true;
      l.oosType = rand(['stock', 'notfound', 'option']);
      if (l.oosType === 'option') {
        l.stock = l.qty;                         // 재고는 있으나 요청 옵션이 없음
        var OPT = rand([
          { label: '색상', choices: ['블랙', '화이트', '블루', '레드', '그린'] },
          { label: '사이즈', choices: ['S', 'M', 'L', 'XL'] }
        ]);
        l.reqOption = { label: OPT.label, value: rand(OPT.choices), choices: OPT.choices };
      } else {
        l.stock = 0;                             // 품절/단종 = 재고 0
      }
      o.reply = 'refund_all';
      o.replied = false;
      return;
    }
    if (o.issue === 'missing_info') {
      var field = rand(['phone', 'addr', 'zip']);
      o[field] = '';
      o.missing = [field];
      return;
    }
    if (o.issue === 'no_ship') {
      var b = rand(NO_SHIP);
      o.city = b[0] + ', ' + b[1];
      o.zip = b[1] === 'AK' ? String(randInt(99501, 99950))
        : b[1] === 'HI' ? String(randInt(96701, 96898))
        : String(randInt(9000, 9999)).padStart(5, '0');
    }
  }

  /* ---------- 저장/복원 ---------- */
  function sigOf(s) {
    return [s.topic, s.margin, s.order_count, s.level, s.updated_at].join('|');
  }
  function save() {
    localStorage.setItem(ORDERS, JSON.stringify(orders));
    localStorage.setItem(PLAN, JSON.stringify(plan));
  }
  function restore(sig) {
    try {
      var p = JSON.parse(localStorage.getItem(PLAN));
      if (!p || p.sig !== sig) return false;          // 세팅이 바뀌었으면 시나리오를 새로 짬
      plan = p;
      orders = JSON.parse(localStorage.getItem(ORDERS)) || [];
      backfill();                                     // 상세 화면용 필드가 없던 옛 주문 보정
      return true;
    } catch (e) { return false; }
  }

  // 주문 상세 화면이 생기기 전에 만들어진 주문에는 배송비·세금·리스크 등이 없다 → 채워 넣는다
  function backfill() {
    var touched = false;
    [].concat(orders, plan.queue).forEach(function (o) {
      if (o.grandTotal != null) return;
      o.email = o.email || emailOf(o.cust);
      o.shipping = SHIP_FEE[o.method] || 4.90;
      o.tax = round2(o.total * TAX_RATE);
      o.grandTotal = round2(o.total + o.shipping + o.tax);
      o.risk = o.risk || riskOf(o);
      o.custOrderNo = o.custOrderNo || (Math.random() < 0.55 ? 1 : randInt(2, 4));
      o.gateway = o.gateway || (Math.random() < 0.5 ? 'PayPal Wallet' : 'Shop Pay');
      (o.lines || []).forEach(function (l) {
        if (!l.sku) l.sku = randSku();
        if (!l.images) l.images = l.image ? [l.image] : [];
      });
      touched = true;
    });
    if (touched) save();
  }

  /* ---------- 렌더 ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function money(n) { return '$' + Number(n).toFixed(2); }

  function paymentBadge(p) {
    return '<span class="ord-badge"><span class="dot"></span>' + (p === 'refunded' ? 'Refunded' : 'Paid') + '</span>';
  }
  function fulfillBadge(f) {
    if (f === 'unfulfilled') return '<span class="ord-badge attn"><span class="dot"></span>Unfulfilled</span>';
    if (f === 'not_required') return '<span class="ord-badge"><span class="dot"></span>Not required</span>';
    return '<span class="ord-badge"><span class="dot"></span>Fulfilled</span>';
  }
  /* 리스크 뱃지 — Low 는 아무것도 안 띄운다 (눈에 걸릴 주문만 눈에 걸리게)
     Medium/High 라고 무조건 사기인 건 아니고, 반대로 사기인데 Low 로 깔리기도 한다 */
  function riskHtml(o) {
    if (o.risk === 'high') return '<span class="risk-badge high">⚠ High</span>';
    if (o.risk === 'medium') return '<span class="risk-badge med">⚠ Medium</span>';
    return '';
  }

  // 상품 사진 + 개수 (마우스를 올리면 상품명)
  function itemsHtml(o) {
    var thumbs = (o.lines || []).map(function (l) {
      return l.image
        ? '<img class="ord-thumb" src="' + esc(l.image) + '" alt="" title="' + esc(l.name) + '">'
        : '<span class="ord-thumb ord-thumb--empty" title="' + esc(l.name) + '">?</span>';
    }).join('');
    return '<span class="ord-items">' + thumbs +
      '<span>' + o.items + (o.items === 1 ? ' item' : ' items') + '</span></span>';
  }
  function custHtml(o) {
    // 정보가 빈 칸은 화면에서도 비어 보인다 → 수강생이 '정보 누락'을 직접 찾아내야 함
    var sub = [o.phone, o.city].filter(Boolean).join(' · ');
    return '<span class="ord-cust" title="' + esc(sub || '연락처 정보 없음') + '">' + esc(o.cust) + '</span>';
  }
  function rowClass(o) {
    if (o.payment === 'refunded') return 'is-refunded';
    if (o.fulfillment === 'unfulfilled') return 'is-open';
    return 'is-done';
  }

  function render() {
    var body = document.getElementById('ordBody');
    if (!orders.length) {
      body.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:48px;">' +
        '아직 주문이 없습니다. 우측 상단 <b>[＋ 주문 받기]</b> 를 눌러 주문을 받아보세요.</td></tr>';
    } else {
      body.innerHTML = orders.map(function (o) {
        return '<tr class="' + rowClass(o) + '" data-no="' + esc(o.no) + '">' +
          '<td class="ord-no">' + esc(o.no) + '</td>' +
          '<td>' + riskHtml(o) + '</td>' +
          '<td>' + esc(o.date) + '</td>' +
          '<td>' + custHtml(o) + '</td>' +
          '<td>' + money(o.grandTotal != null ? o.grandTotal : o.total) + '</td>' +
          '<td>' + paymentBadge(o.payment) + '</td>' +
          '<td>' + fulfillBadge(o.fulfillment) + '</td>' +
          '<td>' + itemsHtml(o) + '</td>' +
          '<td>' + esc(o.method) + '</td>' +
        '</tr>';
      }).join('');
    }
    var total = plan ? plan.total : 0;
    document.getElementById('ordCount').textContent = orders.length + ' / ' + total + '건';

    var left = plan ? plan.queue.length : 0;
    var btn = document.getElementById('receiveBtn');
    btn.disabled = !left;
    btn.textContent = left ? '＋ 주문 받기' : '주문 모두 받음';
    renderStats();
  }

  function renderStats() {
    var total = plan ? plan.total : 0;
    var open = orders.filter(function (o) { return o.fulfillment === 'unfulfilled'; }).length;
    var done = orders.filter(function (o) { return o.fulfillment === 'fulfilled'; }).length;
    var refunded = orders.filter(function (o) { return o.payment === 'refunded'; }).length;

    // 차지백 비율은 '발주해버린 주문' 기준 — 사기 결제 주문을 걸러내지 못했을 때만 올라감
    // (아직 받기만 한 주문의 사기 여부는 화면에 드러나지 않는다)
    var badShipped = orders.filter(function (o) {
      return o.fulfillment === 'fulfilled' && o.issue === 'chargeback';
    }).length;

    var cbRate = done ? Math.round(badShipped / done * 100) : 0;
    var rfRate = orders.length ? Math.round(refunded / orders.length * 100) : 0;
    var progress = total ? Math.round(done / total * 100) : 0;

    document.getElementById('mOpen').textContent = open + '건';
    document.getElementById('mDone').textContent = done + '건';
    document.getElementById('mCb').innerHTML = cbRate + '<small>%</small>';
    document.getElementById('mRefund').innerHTML = rfRate + '<small>%</small>';
    document.getElementById('mProgress').innerHTML = progress + '<small>%</small>';
    document.getElementById('mBar').style.width = progress + '%';

    // 모든 주문을 받고 전부 처리(발주 or 환불)했으면 정산 배너 노출
    var received = orders.length;
    var processed = orders.filter(function (o) { return o.fulfillment !== 'unfulfilled'; }).length;
    var allDone = total > 0 && received === total && processed === total;
    var bar = document.getElementById('doneBar');
    if (bar) {
      bar.innerHTML = allDone
        ? '<div class="done-bar">' +
            '<div class="done-bar__txt">🎉 <b>모든 주문 처리 완료!</b> 최종 이익을 확인해 보세요.</div>' +
            '<a class="btn-primary" href="order-result.html" style="text-decoration:none;">정산하기 →</a>' +
          '</div>'
        : '';
    }

    // 모든 주문 처리 완료 순간 → 저가·느린 배송 주문에서 '배송 지연' 이벤트가 뒤늦게 발생
    if (allDone) processLateEvents();
  }

  // 저가·느린 배송으로 발주한 주문 → 일부는 '배송 기한 미준수 → 환불 요청' 이 뒤늦게 도착
  function processLateEvents() {
    var newRefunds = [];
    var touched = false;
    orders.forEach(function (o) {
      if (o.fulfillment === 'fulfilled' && o.amazon && o.amazon.slowShip && !o.lateProcessed) {
        o.lateProcessed = true;
        touched = true;
        if (Math.random() < 0.55) { o.lateRefund = true; newRefunds.push(o.no); }
      }
    });
    if (touched) save();
    if (newRefunds.length) showLatePopup(newRefunds);
  }

  function showLatePopup(nos) {
    var box = document.createElement('div');
    box.className = 'modal-overlay is-open';
    box.innerHTML =
      '<div class="modal-card" style="max-width:460px;">' +
        '<div class="modal-card__head"><h3>⚠️ 배송 지연 환불 요청</h3><button class="modal-close" data-close>×</button></div>' +
        '<div class="modal-card__body">' +
          '<p style="margin:0 0 12px;font-size:0.92rem;line-height:1.7;">저가·느린 배송으로 처리한 주문 중 <b>' + nos.length + '건</b>이 ' +
          '<b>배송 기한을 넘겨</b> 고객이 환불을 요청했습니다. 해당 매출은 회수되어 손실로 처리됩니다.</p>' +
          '<div style="font-size:0.85rem;color:var(--muted);">대상: ' + nos.map(function (n) { return esc(n); }).join(', ') + '</div>' +
          '<p style="margin:12px 0 0;font-size:0.85rem;">👉 배송이 느린 리스팅(저가·비Prime)은 이런 위험이 있습니다. 정산 결과에 반영됩니다.</p>' +
        '</div>' +
        '<div class="modal-card__foot"><button class="btn-sm is-dark" data-close>확인</button></div>' +
      '</div>';
    document.body.appendChild(box);
    box.addEventListener('click', function (ev) { if (ev.target === box || ev.target.closest('[data-close]')) box.remove(); });
  }

  /* ---------- 동작 ---------- */
  // [주문 받기] → 시나리오에서 1~4건을 '지금 시각'으로 공개
  document.getElementById('receiveBtn').addEventListener('click', function () {
    if (!plan || !plan.queue.length) return;
    var n = Math.min(randInt(1, 4), plan.queue.length);
    var now = new Date();
    var batch = plan.queue.splice(0, n).map(function (o) {
      o.ts = now.getTime();
      o.date = fmtOrderTime(now);
      return o;
    });
    orders = batch.reverse().concat(orders);   // 최신 주문이 위로
    save();
    render();
  });

  // [초기화] → 같은 세팅으로 시나리오를 다시 짬
  document.getElementById('resetBtn').addEventListener('click', function () {
    if (!settings) return;
    if (!confirm('받은 주문을 모두 지우고 처음부터 다시 시작할까요?')) return;
    orders = [];
    plan = buildPlan(sigOf(settings));
    save();
    render();
  });

  // 행 클릭 → 주문 상세 화면
  document.getElementById('ordBody').addEventListener('click', function (e) {
    var tr = e.target.closest('tr[data-no]');
    if (!tr) return;
    location.href = 'order-detail.html?no=' + encodeURIComponent(tr.dataset.no);
  });

  function needSetup(msg) {
    document.getElementById('ordBody').innerHTML =
      '<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:48px;">' + msg +
      '<br><br><a class="btn-primary" href="order-setup.html" style="text-decoration:none;padding:9px 16px;">발주 연습 세팅하러 가기</a>' +
      '</td></tr>';
    document.getElementById('receiveBtn').disabled = true;
  }

  (async function init() {
    var user = await Auth.require();
    if (!user) return;

    var res = await sb.from('practice_settings').select('*').eq('user_id', user.id).maybeSingle();
    settings = res.data;
    if (!settings || !settings.topic || !settings.order_count) {
      needSetup('먼저 <b>발주 연습 세팅</b>에서 주제 · 마진 · 주문 건수 · 난이도를 정하세요.');
      return;
    }

    var pr = await sb.from('products').select('*').eq('topic', settings.topic).eq('active', true);
    catalog = pr.data || [];
    if (!catalog.length) {
      needSetup('"' + esc(settings.topic) + '" 주제에 등록된 상품이 없습니다. 관리자에게 문의하세요.');
      return;
    }

    var sig = sigOf(settings);
    if (!restore(sig)) {            // 처음이거나 세팅이 바뀌었으면 시나리오를 새로 생성
      orders = [];
      plan = buildPlan(sig);
      save();
    }
    render();
  })();
})();
