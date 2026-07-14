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

  async function loadSettings() {
    var res = await sb.from('practice_settings').select('*').eq('user_id', user.id).maybeSingle();
    var s = res.data;
    if (!s) return;
    topicSel.value = s.topic || '';
    marginEl.value = s.margin != null ? s.margin : '';
    countEl.value = s.order_count || '';
    levelEl.value = s.level || '';
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
