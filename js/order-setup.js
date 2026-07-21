/* =========================================================
   발주 연습 세팅
   - 주제 드롭다운 = 어드민이 등록한 topics 중 '표시중(active)' 인 것만
   - 주문 건수 상한 = 그 주제에 등록된 상품 수
     (상품 30개인 주제에 50건 주문을 만들 순 없다 → 30으로 자동 조정 + 안내)
   - 저장하면 practice_settings 에 upsert → 발주 연습하기가 이 값으로 주문 시나리오를 생성
   - 저장 시 이전 연습 주문(localStorage)은 초기화 (새 시나리오이므로)
   ========================================================= */
(function () {
  var topicSel = document.getElementById('topic');
  var marginEl = document.getElementById('margin');
  var countEl = document.getElementById('count');
  var levelEl = document.getElementById('level');
  var startBtn = document.getElementById('startBtn');
  var savedEl = document.getElementById('saved');
  var hintEl = document.getElementById('countHint');
  var warnEl = document.getElementById('countWarn');

  var user = null;
  var maxCount = 0;      // 선택한 주제의 상품 수 = 받을 수 있는 최대 주문 건수

  async function loadTopics() {
    var res = await sb.from('topics').select('name').eq('active', true).order('name');
    if (res.error) {
      topicSel.innerHTML = '<option value="">주제를 불러오지 못했습니다</option>';
      return;
    }
    var list = res.data || [];
    if (!list.length) {
      topicSel.innerHTML = '<option value="">등록된 주제가 없습니다 (관리자 문의)</option>';
      startBtn.disabled = true;
      return;
    }
    topicSel.innerHTML = '<option value="">선택하세요</option>' + list.map(function (t) {
      return '<option>' + t.name + '</option>';
    }).join('');
  }

  // 주제가 바뀌면 그 주제의 상품 수를 세어 상한을 다시 잡는다
  async function refreshMax() {
    var topic = topicSel.value;
    if (!topic) {
      maxCount = 0;
      hintEl.textContent = '';
      warnEl.textContent = '';
      countEl.removeAttribute('max');
      return;
    }
    var res = await sb.from('products')
      .select('id', { count: 'exact', head: true })
      .eq('topic', topic).eq('active', true);
    maxCount = res.count || 0;

    countEl.max = maxCount || 1;
    hintEl.textContent = maxCount
      ? '"' + topic + '" 주제에는 상품이 ' + maxCount + '개 있어 최대 ' + maxCount + '건까지 받을 수 있습니다.'
      : '';
    if (!maxCount) {
      warnEl.textContent = '"' + topic + '" 주제에 등록된 상품이 없습니다. 관리자에게 문의하세요.';
    } else {
      warnEl.textContent = '';
      clampCount();
    }
  }

  // 상한을 넘겨 입력하면 상한으로 자동 조정하고 안내한다
  function clampCount() {
    var v = parseInt(countEl.value, 10);
    if (!maxCount || !isFinite(v)) { warnEl.textContent = ''; return; }
    if (v > maxCount) {
      countEl.value = maxCount;
      warnEl.textContent = '해당 카테고리에는 ' + maxCount + '개의 주문 정보만 등록되어 있습니다. ' +
        '주문 건수를 ' + maxCount + '건으로 조정했습니다.';
    } else {
      warnEl.textContent = '';
    }
  }

  topicSel.addEventListener('change', refreshMax);
  countEl.addEventListener('input', clampCount);
  countEl.addEventListener('blur', clampCount);

  // ---- 난이도 안내 ----
  var levelDesc = document.getElementById('levelDesc');
  var LEVEL_INFO = {
    '하': { title: '하 — 입문', body: '사기·역마진·문제 주문 비율이 낮습니다(약 15%). 아마존에서 잘못된 상품·옵션·비싼 리스팅을 담으려 하면 <b>담기 전에 경고</b>로 막아줍니다. 처음 연습하기 좋습니다.' },
    '중': { title: '중 — 표준', body: '문제 주문 비율이 중간입니다(약 25%). 유사품·바가지·저가 느린배송 같은 소싱 함정이 등장하고, <b>잘못 담으면 체크리스트에 표시</b>됩니다.' },
    '상': { title: '상 — 실전', body: '문제 주문 비율이 높습니다(약 35%). 함정이 많고 가격 차이가 작아 헷갈리며 옵션 함정도 늘어납니다. <b>실수해도 표시가 없고 최종 정산에서만</b> 드러납니다.' },
    '최상': { title: '최상 — 종합 (준비중)', body: '🚧 사기성·허위 주문, 악조건(배송 지연 등)까지 종합한 최고 난이도입니다. <b>향후 업데이트 예정</b>입니다.' }
  };
  function updateLevelDesc() {
    var v = levelEl.value;
    var info = LEVEL_INFO[v];
    if (!info) { levelDesc.hidden = true; startBtn.disabled = false; return; }
    levelDesc.hidden = false;
    levelDesc.className = 'level-desc' + (v === '최상' ? ' is-soon' : '');
    levelDesc.innerHTML = '<b>' + info.title + '</b><br>' + info.body;
    startBtn.disabled = (v === '최상');
  }
  levelEl.addEventListener('change', updateLevelDesc);

  async function loadSettings() {
    var res = await sb.from('practice_settings').select('*').eq('user_id', user.id).maybeSingle();
    var s = res.data;
    if (!s) return;
    topicSel.value = s.topic || '';
    marginEl.value = s.margin != null ? s.margin : '';
    countEl.value = s.order_count || '';
    levelEl.value = s.level || '';
    updateLevelDesc();
    await refreshMax();
  }

  startBtn.addEventListener('click', async function () {
    var topic = topicSel.value;
    var margin = parseFloat(marginEl.value);
    var count = parseInt(countEl.value, 10);
    var level = levelEl.value;

    if (!topic) { alert('주제를 선택하세요.'); return; }
    if (!maxCount) { alert('이 주제에는 등록된 상품이 없습니다.'); return; }
    if (!isFinite(margin)) { alert('설정 마진을 입력하세요.'); return; }
    if (!count || count < 1) { alert('받을 주문 건수를 입력하세요.'); return; }
    if (!level) { alert('난이도를 선택하세요.'); return; }
    if (level === '최상') { alert('최상 난이도는 향후 업데이트 예정입니다.\n하 · 중 · 상 중에서 선택해 주세요.'); return; }

    if (count > maxCount) { clampCount(); count = maxCount; }

    startBtn.disabled = true;
    var res = await sb.from('practice_settings').upsert({
      user_id: user.id,
      topic: topic,
      margin: margin,
      order_count: count,
      level: level,
      updated_at: new Date().toISOString(),
    });
    startBtn.disabled = false;

    if (res.error) { alert('저장 실패: ' + res.error.message); return; }

    // 새 시나리오이므로 이전 연습 주문은 버림
    localStorage.removeItem('practice_orders');
    localStorage.removeItem('practice_nextno');
    localStorage.removeItem('practice_plan');

    savedEl.hidden = false;
    location.href = 'order-practice.html';
  });

  (async function init() {
    user = await Auth.require();
    if (!user) return;
    await loadTopics();
    await loadSettings();
  })();
})();
