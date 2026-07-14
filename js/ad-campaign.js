/* =========================================================
   캠페인 만들기 (쇼피파이 Create campaign 재현)
   - 광고 설정하기 → [Create campaign] → ad-campaign.html

   [핵심 개념]
   CAC (고객 획득 비용) = 고객 한 명을 데려오는 데 쓰는 광고비
   TOV (목표 객단가)    = 주문 한 건에서 기대하는 매출
   ROAS = 매출 / 광고비 ≈ TOV / CAC

   → CAC 를 객단가보다 높게 잡으면 ROAS 가 1 밑으로 떨어진다 = 팔수록 손해.
     수강생이 이걸 몸으로 알게 하는 게 이 화면의 목적이다.
   ========================================================= */
(function () {
  var STORE = 'ad_campaigns';

  var segments = { new: true, lapsed: true };   // 켜져 있는 세그먼트 (전체 고객은 항상 켜짐)

  function money(n) { return '$' + Number(n || 0).toFixed(2); }
  function num(id) { return parseFloat(document.getElementById(id).value) || 0; }
  function round2(n) { return Math.round(n * 100) / 100; }
  function randF(a, b) { return Math.random() * (b - a) + a; }
  function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

  /* ---------- 현재 입력값 ---------- */
  function read() {
    var cacs = [{ name: '전체 고객', value: num('cacAll') }];
    if (segments.new) cacs.push({ name: '신규 고객', value: num('cacNew') });
    if (segments.lapsed) {
      cacs.push({
        name: '이탈 고객 · ' + document.getElementById('lapsedTerm').value,
        value: num('cacLapsed')
      });
    }
    var avg = cacs.reduce(function (a, c) { return a + c.value; }, 0) / cacs.length;

    return {
      name: document.getElementById('cname').value.trim(),
      country: document.getElementById('country').value,
      tov: num('tov'),
      budget: num('budget'),
      cacs: cacs,
      avgCac: round2(avg),
      term: document.getElementById('lapsedTerm').value,
    };
  }

  /* ---------- 예상 ROAS ----------
     매출/광고비 ≈ 객단가/획득비용. 실제로는 오차가 있으므로 범위로 보여준다. */
  function roasRange(s) {
    if (!s.avgCac) return [0, 0];
    var base = s.tov / s.avgCac;
    return [round2(base * 0.85), round2(base * 1.15)];
  }

  /* ---------- 요약 다시 그리기 ---------- */
  function refresh() {
    var s = read();
    var r = roasRange(s);

    document.getElementById('sTov').textContent = money(s.tov);
    document.getElementById('sCac').textContent = money(s.avgCac);
    document.getElementById('sSegs').innerHTML = s.cacs.map(function (c) {
      return '<div class="adv-seg"><span>' + c.name + '</span><b>' + money(c.value) + '</b></div>';
    }).join('');
    document.getElementById('sRoas').textContent = r[0].toFixed(1) + 'x - ' + r[1].toFixed(1) + 'x';

    // 획득 비용이 객단가에 가깝거나 넘으면 광고를 돌릴수록 손해
    var warn = document.getElementById('sWarn');
    if (!s.tov || !s.avgCac) { warn.innerHTML = ''; }
    else if (s.avgCac >= s.tov) {
      warn.innerHTML = '<div class="adv-warn danger">⚠ 고객 한 명을 데려오는 비용(' + money(s.avgCac) +
        ')이 객단가(' + money(s.tov) + ')보다 큽니다. <b>팔수록 손해입니다.</b></div>';
    } else if (r[1] < 2) {
      warn.innerHTML = '<div class="adv-warn">⚠ 예상 ROAS가 2배 미만입니다. 원가와 배송비를 빼면 남는 게 거의 없습니다.</div>';
    } else {
      warn.innerHTML = '';
    }

    // 빠진 세그먼트를 다시 추가하는 칩
    var add = document.getElementById('segAdd');
    var chips = [];
    if (!segments.new) chips.push('<button class="adv-chip adv-chip--add" data-add="new">+ 신규 고객</button>');
    if (!segments.lapsed) chips.push('<button class="adv-chip adv-chip--add" data-add="lapsed">+ 이탈 고객</button>');
    add.innerHTML = chips.join('');
  }

  /* ---------- 세그먼트 켜고 끄기 ---------- */
  document.addEventListener('click', function (e) {
    var del = e.target.closest('.cac-row__del');
    if (del) {
      segments[del.dataset.seg] = false;
      document.querySelector('.cac-row[data-seg="' + del.dataset.seg + '"]').hidden = true;
      refresh();
      return;
    }
    var add = e.target.closest('[data-add]');
    if (add) {
      segments[add.dataset.add] = true;
      document.querySelector('.cac-row[data-seg="' + add.dataset.add + '"]').hidden = false;
      refresh();
    }
  });

  document.querySelectorAll('input, select').forEach(function (el) {
    el.addEventListener('input', refresh);
    el.addEventListener('change', refresh);
  });

  document.getElementById('resetBtn').addEventListener('click', function () {
    document.getElementById('cacAll').value = 30.65;
    document.getElementById('cacNew').value = 38.31;
    document.getElementById('cacLapsed').value = 38.31;
    document.getElementById('tov').value = 76.62;
    document.getElementById('budget').value = 765;
    segments.new = segments.lapsed = true;
    document.querySelectorAll('.cac-row[data-seg]').forEach(function (r) { r.hidden = false; });
    refresh();
  });

  /* ---------- 캠페인 시작 ----------
     설정값대로 성과가 나온다: 예상 ROAS 범위 안에서 실제 ROAS 가 결정됨 */
  document.getElementById('startBtn').addEventListener('click', function () {
    var s = read();
    if (!s.name) { alert('캠페인 이름을 입력하세요.'); return; }
    if (!s.budget) { alert('일 예산을 입력하세요.'); return; }
    if (!s.tov) { alert('목표 객단가를 입력하세요.'); return; }

    var r = roasRange(s);
    if (s.avgCac >= s.tov &&
        !confirm('획득 비용이 객단가보다 큽니다. 이대로 시작하면 광고를 돌릴수록 손해입니다.\n\n그래도 시작할까요?')) {
      return;
    }

    var days = randInt(4, 12);                       // 지금까지 집행된 일수
    var spend = round2(s.budget * days * randF(0.85, 1.05));
    var roas = round2(randF(r[0], r[1]));
    var sales = round2(spend * roas);
    var aov = round2(s.tov * randF(0.92, 1.08));
    var customers = Math.max(1, Math.round(sales / aov));

    var c = {
      id: Date.now(),
      name: s.name,
      budget: s.budget,
      country: s.country,
      segment: 'All',
      tov: s.tov,
      cacs: s.cacs,
      start: new Date().toISOString().slice(0, 10),
      end: null,
      status: 'active',
      spend: spend,
      sales: sales,
      roas: roas,
      aov: aov,
      customers: customers,
      cac: round2(spend / customers),
      alert: roas < 3 ? 'TOV' : null,
    };

    var list = [];
    try { list = JSON.parse(localStorage.getItem(STORE)) || []; } catch (e) { list = []; }
    list.unshift(c);
    localStorage.setItem(STORE, JSON.stringify(list));

    location.href = 'ad-settings.html';
  });

  (async function init() {
    var user = await Auth.require();
    if (!user) return;

    // 다음 캠페인 번호를 이름 기본값으로
    var list = [];
    try { list = JSON.parse(localStorage.getItem(STORE)) || []; } catch (e) { list = []; }
    document.getElementById('cname').value =
      '새 캠페인 ' + String(list.length + 1).padStart(2, '0');

    refresh();
  })();
})();
