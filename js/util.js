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

/* 연습/광고 시뮬 저장소. 공용 데모(테스트) 계정은 sessionStorage 를 써서
   탭별로 격리되고 탭을 닫으면 자동 삭제된다(여러 명이 동시에 써도 안 섞이고 안 쌓임).
   auth/광고 코드가 is_demo 확인 후 window.__demoSim = true 로 켠다. */
function simStore() { return window.__demoSim ? window.sessionStorage : window.localStorage; }

/* ---------- 연결 장애 안내 (Supabase 점검/일시정지 등) ----------
   서버가 멈추면 쿼리가 throw → 미처리로 빈 화면이 된다.
   전역에서 네트워크성 실패를 잡아 친절한 오버레이를 띄운다. */
function showConnError() {
  if (typeof document === 'undefined' || !document.body || document.getElementById('__connErr')) return;
  var d = document.createElement('div');
  d.id = '__connErr';
  d.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(255,255,255,0.97);display:flex;align-items:center;justify-content:center;padding:24px;font-family:system-ui,-apple-system,sans-serif;';
  d.innerHTML =
    '<div style="text-align:center;max-width:420px;">' +
      '<div style="font-size:2.6rem;">🔌</div>' +
      '<h2 style="margin:12px 0 8px;font-size:1.3rem;color:#0F172A;font-weight:600;">서비스에 연결할 수 없어요</h2>' +
      '<p style="color:#475569;line-height:1.6;font-size:0.95rem;margin:0;">일시적인 접속 문제이거나 서버 점검 중일 수 있습니다.<br>잠시 후 다시 시도해 주세요.</p>' +
      '<button id="__connReload" style="margin-top:18px;padding:11px 24px;border:none;border-radius:9999px;background:#2563EB;color:#fff;font-size:0.95rem;font-weight:600;cursor:pointer;">새로고침</button>' +
    '</div>';
  document.body.appendChild(d);
  var btn = document.getElementById('__connReload');
  if (btn) btn.addEventListener('click', function () { location.reload(); });
}
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', function (e) {
    var msg = String((e && e.reason && (e.reason.message || e.reason)) || '');
    // 네트워크/DNS/연결 실패 계열만 (RLS·권한 등 정상 오류는 각 페이지가 처리)
    if (/failed to fetch|networkerror|network error|load failed|err_|enotfound|econnrefused|dns|typeerror: fetch/i.test(msg)) {
      showConnError();
    }
  });
}

/* ---------- 표 헤더 클릭 정렬 (관리자 표 공용) ----------
   각 셀의 텍스트(또는 data-sortval)로 정렬. 숫자는 자동 인식, 날짜(YYYY-MM-DD)는 문자열.
   특정 열을 빼려면 <th data-nosort>. tbody 를 다시 그려도 헤더 리스너는 유지된다. */
function cellSortVal(td) {
  if (!td) return '';
  if (td.hasAttribute('data-sortval')) {
    var v = td.getAttribute('data-sortval'); var vn = parseFloat(v);
    return isNaN(vn) ? v : vn;
  }
  var t = (td.textContent || '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t;              // 날짜는 문자열(ISO 정렬)
  var s = t.replace(/[,\s]/g, '').replace(/^[$₩€£¥]/, ''); // 구분자·앞 통화기호 제거
  var m = s.match(/^-?\d+(\.\d+)?/);                       // 맨 앞이 숫자일 때만 숫자 취급(이메일 등 보호)
  return m ? parseFloat(m[0]) : t;
}
function initSortableTables(root) {
  (root || document).querySelectorAll('table').forEach(function (table) {
    if (table.__sortInit) return;
    var thead = table.tHead;
    if (!thead || !thead.rows.length) return;
    table.__sortInit = true;
    var ths = thead.rows[thead.rows.length - 1].cells;
    Array.prototype.forEach.call(ths, function (th, idx) {
      if (th.hasAttribute('data-nosort')) return;
      th.classList.add('th-sortable');
      th.addEventListener('click', function () {
        var tbody = table.tBodies[0];
        if (!tbody) return;
        var rows = Array.prototype.slice.call(tbody.rows).filter(function (r) {
          return r.cells.length > idx && !(r.cells.length === 1 && r.cells[0].hasAttribute('colspan'));
        });
        if (rows.length < 2) return;
        var asc = th.getAttribute('data-dir') !== 'asc';
        Array.prototype.forEach.call(ths, function (h) { h.classList.remove('sort-asc', 'sort-desc'); h.removeAttribute('data-dir'); });
        th.setAttribute('data-dir', asc ? 'asc' : 'desc');
        th.classList.add(asc ? 'sort-asc' : 'sort-desc');
        rows.sort(function (a, b) {
          var av = cellSortVal(a.cells[idx]), bv = cellSortVal(b.cells[idx]);
          var an = typeof av === 'number', bn = typeof bv === 'number', r;
          if (an && bn) r = av - bv;           // 숫자끼리
          else if (an) r = -1;                 // 숫자를 텍스트보다 앞으로 (일관된 순서)
          else if (bn) r = 1;
          else r = String(av).localeCompare(String(bv), 'ko');
          return asc ? r : -r;
        });
        rows.forEach(function (r) { tbody.appendChild(r); });
      });
    });
  });
}
if (typeof document !== 'undefined') {
  var _initSort = function () { if (document.body && document.body.dataset.area === 'admin') initSortableTables(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _initSort);
  else _initSort();
}
