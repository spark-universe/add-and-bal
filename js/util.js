/* 공통 유틸리티 (js/util.js)
   여러 화면에 흩어져 중복되던 순수 헬퍼와 '발주·광고 연습 공용 규칙'을 한 곳에 모음.
   전역 함수로 노출되므로 각 페이지 스크립트가 그대로 esc()/money()/optionOf() 로 호출한다.
   반드시 supabase.js 다음, 각 페이지 전용 스크립트보다 먼저 로드할 것. */

/* ---------- 문자열/숫자 ---------- */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}
function money(n, d) { return '$' + Number(n || 0).toFixed(d == null ? 2 : d); }
function round2(n) { return Math.round(n * 100) / 100; }

/* ---------- 난수 ---------- */
function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
function rand(a) { return a[Math.floor(Math.random() * a.length)]; }
function shuffle(a) {
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

/* 결정적 해시 (같은 입력 → 같은 값). 아마존 상품 옵션·별점 등을 안정적으로 생성. */
function h(s) {
  var n = 0; s = String(s);
  for (var i = 0; i < s.length; i++) n = (n * 31 + s.charCodeAt(i)) >>> 0;
  return n;
}

/* ---------- 날짜 (풀 포맷: "July 20, 2026 at 3:05 pm") ---------- */
function fmtFull(ts) {
  if (!ts) return '';
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  var d = new Date(ts);
  var hr = d.getHours(), ampm = hr >= 12 ? 'pm' : 'am', h12 = hr % 12 || 12;
  var mm = String(d.getMinutes()).padStart(2, '0');
  return MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear() +
    ' at ' + h12 + ':' + mm + ' ' + ampm;
}
function dayStr(ts) { return ts ? fmtFull(ts).split(' at ')[0] : '-'; }

/* ================= 발주·광고 연습 공용 규칙 =================
   여러 화면(아마존 소싱/주문 상세/정산/광고 설정)이 반드시 동일하게 계산해야 하는 로직.
   예전엔 각 파일에 복제돼 어긋날 위험이 있어 여기로 통합함. */

/* 아마존 옵션(색상/사이즈/용량) — 주문·상품별로 결정적으로 생성. 난이도로 등장 빈도 조절. */
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

/* 주문 하나가 어느 광고 캠페인에서 왔는지 (o.fromAd 는 생성 시 80% 확률로 결정). */
function campForOrder(o, names) {
  if (!names || !names.length) return null;
  var n = parseInt(String(o.no).replace(/\D/g, ''), 10) || 0;
  var fromAd = (o.fromAd != null) ? o.fromAd : (n % 10 < 8);   // 구버전 주문은 결정적 폴백
  if (!fromAd) return null;                                     // 직접 유입 = 광고 미귀속
  return names[n % names.length];
}

/* 실제 광고비 = 광고로 들어온 주문마다 그 캠페인의 CAC 합 (일 예산과 무관). */
function adSpendLive(orders, camps) {
  var names = camps.map(function (c) { return c.name; });
  var total = 0;
  (orders || []).forEach(function (o) {
    var nm = campForOrder(o, names);
    if (nm) {
      var c = camps.find(function (x) { return x.name === nm; });
      total += Number(c && (c.targetCac != null ? c.targetCac : c.cac)) || 0;
    }
  });
  return round2(total);
}

/* 캠페인 1개의 실시간 성과 (광고 유입 주문 기준). 광고비 = CAC × 획득 고객. */
function campaignLive(c, orders, names) {
  var customers = 0, sales = 0;
  (orders || []).forEach(function (o) {
    if (campForOrder(o, names) !== c.name) return;
    customers++;
    if (o.fulfillment === 'fulfilled') sales += Number(o.grandTotal != null ? o.grandTotal : o.total || 0);
  });
  var cac = Number(c.targetCac != null ? c.targetCac : c.cac) || 0;
  var spend = round2(cac * customers);
  return {
    customers: customers, sales: round2(sales), spend: spend,
    aov: customers ? round2(sales / customers) : 0,
    cac: customers ? round2(spend / customers) : 0,
    roas: spend ? round2(sales / spend) : 0
  };
}
