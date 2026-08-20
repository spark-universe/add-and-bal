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
    answer: '광고 효율을 높여 CAC를 낮추거나 객단가(TOV)를 높여 ROAS를 3.5배 이상으로. 예) CAC $20 · TOV $70 → ROAS 3.5',
    explain: 'ROAS 2.4는 광고비 대비 매출이 낮아 팔수록 손해입니다. 타겟·소재를 개선해 CAC를 낮추거나, 묶음·업셀로 객단가를 높여 ROAS를 3.5배 이상으로 끌어올려야 손익 구조가 개선됩니다.',
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
    note: 'ROAS만 보면 안정권처럼 보입니다. 하지만 ROAS가 높아도 제품 마진에 문제가 있으면 손해가 날 수 있어, 광고를 켜두기만 하지 말고 계속 모니터링·분석해야 합니다.',
    // 순이익 = 매출×0.5(마진) − 매출×0.2 − 광고비 = 3200×0.3 − 900 = +$60 (−500~+250)
    perf: { customers: 30, spend: 900, sales: 3200, startDaysAgo: 0 },
    answer: 'ROAS를 4.5배 이상으로(예: CAC $24 · TOV $110 → ROAS 4.6). 단, 광고는 끄지 말고 계속 모니터링.',
    explain: 'ROAS 자체는 문제가 아닐 수 있습니다. 오히려 ROAS가 높은데도 순이익이 빠듯하다면 제품 마진 구조에 문제가 있다는 신호입니다. 매출의 약 50%가 마진이고 여기서 비용(약 20%)과 광고비를 빼면 남는 이익이 적을 수 있으니, 광고를 끄기보다 원가·마진을 점검하며 계속 모니터링하세요.',
    goal: {
      min: 4.5,
      pass: 'ROAS 자체는 문제가 없을 수 있습니다. 다만 ROAS가 4.5배 이상이면 안정권이라기보다 제품 마진에 문제가 있을 수 있으니, 광고는 끄지 말고 계속 모니터링하며 원가·마진을 점검하세요.',
      fail: '마진을 감안하면 아직 빠듯합니다. 원가·마진을 계산해 ROAS를 4.5배 이상으로 올려 여유를 확보하세요.'
    }
  },
  {
    key: 'nosale',
    name: '판매 안 됨 (ROAS 조정)',
    cac: 15, tov: 90, budget: 200,
    note: 'CAC가 너무 낮고 목표 객단가(TOV)가 너무 높아 판매가 거의 없습니다. 한쪽만 고쳐서는 해결되지 않고, CAC를 조금 높이고 TOV를 조금 낮춰 둘 다 조정해야 합니다.',
    // 주문 2건, 매출 매우 낮음, Start 는 1주일 전
    perf: { customers: 2, spend: 30, sales: 54, startDaysAgo: 7 },
    answer: 'CAC는 올리고(>$15) TOV는 낮춰(<$90) 둘 다 조정 + ROAS 4배 안팎. 예) CAC $20 · TOV $85 → ROAS 4.25',
    explain: 'CAC가 너무 낮으면 광고가 충분히 노출·경쟁되지 않고, TOV가 너무 높으면 전환이 잘 안 됩니다. 두 수치가 함께 어긋나 있어 한쪽만 고쳐선 해결되지 않습니다. CAC를 조금 올리고 TOV를 조금 낮춰 판매가 이뤄질 균형(ROAS 4배 안팎)을 맞추세요.',
    // CAC 는 원래(15)보다 높이고 TOV 는 원래(90)보다 낮춰야(둘 다) + ROAS 4배 이상
    goal: {
      min: 4.0, cacAbove: 15, tovBelow: 90,
      pass: '좋습니다! CAC를 높이고 TOV를 낮춰 둘 다 조정해 판매가 이뤄질 균형을 맞췄습니다.',
      fail: 'CAC가 너무 낮고 TOV가 너무 높은 게 문제라, 한쪽만 바꿔선 안 됩니다. CAC를 조금 높이고 TOV를 조금 낮춰(둘 다) ROAS가 4배 이상이 되도록 조정하세요.'
    }
  }
];

/* goal 판정: m = { roas, cac, tov }
   - min/max     : ROAS 범위
   - cacAbove    : CAC 가 이 값보다 커야 함 (예: 원래보다 높여야)
   - tovBelow    : TOV 가 이 값보다 작아야 함 (예: 원래보다 낮춰야)
   모두 선택 항목이며, 지정된 조건을 전부 만족해야 통과. */
window.adDemoCaseGoalOk = function (goal, m) {
  if (!goal) return true;
  if (goal.min != null && m.roas < goal.min) return false;
  if (goal.max != null && m.roas > goal.max) return false;
  if (goal.cacAbove != null && !(m.cac > goal.cacAbove)) return false;
  if (goal.tovBelow != null && !(m.tov < goal.tovBelow)) return false;
  return true;
};
