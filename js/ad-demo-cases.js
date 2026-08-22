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
    note: 'ROAS가 2점대로, 광고비 대비 매출이 너무 적습니다. 광고비를 쓴 만큼 벌지 못해 팔면 팔수록 손해가 나는 구조입니다.',
    // ROAS 2.4 (2~2.9) — 매출 2880 / 광고비 1200
    perf: { customers: 48, spend: 1200, sales: 2880, startDaysAgo: 0 },
    answer: '광고 효율을 높여 CAC를 낮추거나, 객단가(TOV)를 높여 ROAS를 4배 이상으로.\n예) CAC $20 · TOV $80 → ROAS 4.0',
    explain: 'CAC를 낮추거나 객단가(TOV)를 높여 ROAS를 4배 이상으로 올리면, 광고비를 마진 안에서 감당할 수 있습니다.\n예) $60짜리 제품에 광고비 $25를 쓰면 겉보기엔 $35가 남지만, 실제 마진이 $25~$35 수준이면 원가·배송비·수수료를 빼는 순간 손해가 날 수 있습니다.\n그래서 마진 안에서 광고비가 감당되는 수준까지 CAC·TOV를 조정하는 것이 정답입니다.',
    goal: {
      min: 4,
      pass: '좋습니다! 손해 구간에서 벗어나 안정적인 ROAS로 조정했습니다.',
      fail: '아직 ROAS가 낮아 손해 구조입니다. CAC를 낮추거나 목표 객단가(TOV)를 높여 ROAS를 4배 이상으로 만들어 주세요.'
    }
  },
  {
    key: 'analyze',
    name: 'ROAS 분석 필요',
    cac: 30, tov: 110, budget: 250,
    note: 'ROAS는 안정권처럼 보이지만, 매출 대비 광고비가 높거나 제품 마진이 약 20%로 낮으면 실제로는 손해일 수 있습니다. ROAS 수치만으로는 손익을 판단하기 어려운 상황입니다.',
    // 순이익 = 매출×0.5(마진) − 매출×0.2 − 광고비 = 3200×0.3 − 900 = +$60 (−500~+250)
    perf: { customers: 30, spend: 900, sales: 3200, startDaysAgo: 0 },
    answer: 'ROAS를 4.5배 이상으로 올리기.\n예) CAC $24 · TOV $110 → ROAS 4.6\n단, 광고는 끄지 말고 계속 모니터링하세요.',
    explain: 'ROAS를 4.5배 이상으로 올려도, 마진이 낮으면 광고비를 뺀 뒤 남는 이익은 여전히 빠듯할 수 있습니다.\n그래서 광고를 끄기보다, 원가·마진을 직접 계산해 실제로 남는 이익을 확인하고 계속 모니터링하며 조정하는 것이 정답입니다.\n즉 ROAS 숫자가 아니라 "실제로 남는 이익"을 기준으로 판단해야 합니다.',
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
    note: 'CAC가 너무 낮고 목표 객단가(TOV)가 너무 높아 주문이 거의 발생하지 않아, 일주일간 주문 2건에 그쳐 매출이 매우 낮습니다.',
    // 주문 2건이 정가($90)로 판매 → 매출 180, 광고비 30 (ROAS 6.0이지만 판매량 자체가 너무 적음)
    perf: { customers: 2, spend: 30, sales: 180, startDaysAgo: 7 },
    answer: 'CAC는 조금 올리고(>$15), TOV는 조금 낮춰서(<$90) 둘 다 조정하기.\n목표 ROAS는 4배 안팎.\n예) CAC $20 · TOV $85 → ROAS 4.25',
    explain: 'ROAS(6.0)만 보면 좋아 보이지만, 실제 판매량이 너무 적은 게 진짜 문제입니다.\n원인이 두 가지라 한쪽만 고치면 다른 쪽이 발목을 잡습니다.\n· CAC가 너무 낮으면 광고가 충분히 노출되지 않아 주문 자체가 안 들어옵니다.\n· TOV가 너무 높으면 비싸서 구매 전환이 안 됩니다.\n그래서 CAC를 조금 올리고 TOV를 조금 낮춰 둘 다 조정해, ROAS는 4배 안팎으로 낮아지더라도 판매량을 늘리는 것이 정답입니다.',
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
