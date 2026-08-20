/* =========================================================
   데모 계정 전용 · 광고 진단 케이스
   - 공용 데모(is_demo) 계정으로 접속하면 아래 3개 캠페인이
     세션(sessionStorage)에 자동으로 깔린다 → 브라우저 탭마다 따로.
   - 일반 계정에는 절대 뜨지 않는다. (seed 는 window.__demoSim 일 때만)
   - 각 케이스는 '문제가 있는 광고 설정'이고, 수강생이 수정하며 진단한다.
     캠페인 이름 옆 ? 에 마우스를 올리면 note(문제점)가 뜬다.
     수정 저장 시 goal(min/max ROAS)을 만족하면 성공, 아니면 다시.

   [수치 조정] cac/tov/budget 과 goal 의 min/max 만 고치면 된다.
     ROAS ≈ TOV / CAC  (예산은 ROAS 계산에 직접 쓰이지 않음)
       · low     60/25 = 2.4
       · analyze 110/30 ≈ 3.67
       · nosale  90/15 = 6.0
   ========================================================= */
/* perf = '실제 주문이 발생했다는 가정'의 고정 성과값 (그때그때 바뀌지 않게 고정).
   - customers/spend/sales 로 표·상단바의 CAC·AOV·ROAS 가 계산된다.
   - startDaysAgo: 접속일 기준 Start 를 며칠 전으로 둘지. */
window.AD_DEMO_CASES = [
  {
    key: 'low',
    name: 'ROAS 저조',
    cac: 25, tov: 60, budget: 100,
    note: 'ROAS가 2점대라 팔면 팔수록 손해를 보는 구조입니다. 광고 효율을 높이는 개선이 필요합니다.',
    // ROAS 2.4 (2~2.9) — 매출 2880 / 광고비 1200
    perf: { customers: 48, spend: 1200, sales: 2880, startDaysAgo: 0 },
    goal: {
      min: 3.5,
      pass: '좋습니다! 손해 구간에서 벗어나 안정적인 ROAS로 조정했습니다.',
      fail: '아직 ROAS가 낮아 손해 구조입니다. CAC를 낮추거나 목표 객단가(TOV)를 높여 ROAS를 3.5배 이상으로 만들어 주세요.'
    }
  },
  {
    key: 'analyze',
    name: 'ROAS 분석 필요',
    cac: 30, tov: 110, budget: 250,
    note: 'ROAS만 보면 안정권처럼 보이지만, 마진을 따지면 손해가 날 수 있습니다. 원가·마진을 계산해 분석이 필요한 수치입니다.',
    // 순이익 = 매출×0.5(마진) − 매출×0.2 − 광고비 = 3200×0.3 − 900 = +$60 (−500~+250)
    perf: { customers: 30, spend: 900, sales: 3200, startDaysAgo: 0 },
    goal: {
      min: 4.5,
      pass: '좋습니다! 마진을 감안해도 안전한 수준으로 분석·조정했습니다.',
      fail: '마진을 감안하면 아직 빠듯합니다. ROAS를 4.5배 이상으로 올려 마진 여유를 확보해 주세요.'
    }
  },
  {
    key: 'nosale',
    name: '판매 안 됨 (ROAS 조정)',
    cac: 15, tov: 90, budget: 200,
    note: 'CAC가 낮은데 목표 객단가(TOV)가 너무 높아 판매가 원활하지 않습니다. 일주일간 주문이 거의 없어 매출이 매우 낮습니다. 수치 조정이 필요합니다.',
    // 주문 2건, 매출 매우 낮음, Start 는 1주일 전
    perf: { customers: 2, spend: 30, sales: 54, startDaysAgo: 7 },
    goal: {
      min: 2.5, max: 4.0,
      pass: '좋습니다! 판매가 이뤄질 수 있는 현실적인 수준으로 조정했습니다.',
      fail: '목표 객단가(TOV)가 너무 높아 판매가 어렵습니다. TOV를 낮춰 ROAS를 2.5~4.0배 사이로 조정해 주세요.'
    }
  }
];

/* goal 판정: ROAS 가 min~max 범위를 만족하면 통과. (min/max 는 선택) */
window.adDemoCaseGoalOk = function (goal, roas) {
  if (!goal) return true;
  if (goal.min != null && roas < goal.min) return false;
  if (goal.max != null && roas > goal.max) return false;
  return true;
};
