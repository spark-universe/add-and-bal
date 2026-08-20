/* =========================================================
   마케팅 핵심 용어 사전 데이터 (챌린지 매뉴얼과 별도로 관리)
   - ad-glossary.html (용어사전 새 창) 이 이 데이터를 렌더링한다
   - 광고 설정 화면의 각 용어 옆 ? 툴팁도 여기 short 를 쓴다 (추후)

   [수정 방법]
   아래 terms 배열만 고치면 용어사전과 툴팁에 함께 반영됩니다.
     key   : 툴팁을 붙일 때 쓰는 식별자
     badge : 대시보드에 표시되는 지표면 번호(①②③), 개념 용어면 null
     term  : 용어명 (약어/영문)
     en    : 풀네임 · 한글명
     short : ? 툴팁 한 줄 설명
     full  : 용어사전 카드 본문 설명
   ========================================================= */
window.AD_GLOSSARY = {
  title: '마케팅 핵심 용어 사전',
  intro: '①②③ 파란 번호는 광고 설정 대시보드에서 해당 지표가 표시된 위치입니다. 번호가 없는 용어는 화면에 직접 나타나지 않는 개념입니다.',

  terms: [
    {
      key: 'cac', badge: 1, term: 'CAC', en: 'Customer Acquisition Cost · 고객 획득 비용',
      short: '고객 1명을 확보하는 데 사용된 비용.',
      full: '고객 1명을 확보하는 데 사용된 비용입니다.'
    },
    {
      key: 'aov', badge: 2, term: 'AOV', en: 'Average Order Value · 평균 주문 금액',
      short: '실제 주문 1건당 평균 주문 금액.',
      full: '실제 주문 1건당 평균 주문 금액입니다.'
    },
    {
      key: 'roas', badge: 3, term: 'ROAS', en: 'Return on Ad Spend · 광고 수익률',
      short: '광고비 대비 발생한 매출 비율.',
      full: '광고비 대비 발생한 매출 비율입니다.'
    },
    {
      key: 'tov', badge: null, term: 'TOV', en: 'Target Order Value · 목표 주문 금액',
      short: '주문 1건당 목표로 설정한 금액.',
      full: '주문 1건당 목표로 설정한 금액입니다.'
    },
    {
      key: 'margin', badge: null, term: 'Margin', en: '마진',
      short: '매출에서 원가·비용을 뺀 이익(또는 이익률).',
      full: '매출에서 상품 원가 및 비용을 제외하고 남는 이익 또는 이익률입니다.'
    },
    {
      key: 'negmargin', badge: null, term: '역마진', en: 'Negative Margin',
      short: '이익보다 광고비 등 비용이 커 손실이 난 상태.',
      full: '상품 판매 후 발생한 이익보다 광고비 등의 비용이 커 손실이 발생한 상태입니다.'
    }
  ]
};
