# Dock 스타일 디자인 시스템 (Design System Spec)

> 업로드된 스크린샷 10장을 분석해 재구성한 디자인 가이드입니다.
> 색상·폰트 값은 이미지 기반의 **시각적 추정치**이므로, 실제 적용 시 미세 조정하세요.
> CSS 변수 · 컴포넌트 코드는 그대로 복사해서 사용할 수 있습니다.

---

## 0. 디자인 한 줄 요약 (Design DNA)

| 축 | 방향성 |
|----|--------|
| **분위기** | 밝고 깨끗한(Clean & Airy) 엔터프라이즈 SaaS |
| **컬러** | 화이트 베이스 + 은은한 블루 그라디언트 / 포인트는 채도 높은 로열 블루 |
| **타이포** | 아주 큰 헤딩, geometric grotesque, 미디엄~세미볼드 굵기 |
| **형태** | 크게 둥근 모서리(카드 16~24px), 알약(pill) 버튼·태그 |
| **깊이감** | 아주 옅은 그림자로 최소한의 입체감만 (플랫에 가까움) |
| **여백** | 넉넉한 섹션 패딩, 콘텐츠 중앙 정렬 (max ~1200px) |
| **시그니처** | 파스텔 지표 카드 · 오빗형 원형 다이어그램 · 제품 목업 프레임 |

핵심 원칙: **"화려함은 한 곳에만."** 배경·구조는 조용하게 두고, 큰 타이포와 컬러 지표 카드에서만 강하게 표현합니다.

---

## 1. 컬러 시스템 (Color Tokens)

```css
:root {
  /* ---------- Brand ---------- */
  --color-primary:        #2563EB;  /* 메인 블루: 버튼, 링크, 로고, 강조 */
  --color-primary-hover:  #1D4ED8;  /* hover / active */
  --color-primary-soft:   #EAF1FE;  /* 연한 블루 배경 (탭 활성, 하이라이트) */

  /* ---------- Text ---------- */
  --color-text:           #0F172A;  /* 헤딩·주요 텍스트 (거의 검정, 순수 검정 아님) */
  --color-text-body:      #475569;  /* 본문 */
  --color-text-muted:     #94A3B8;  /* 라벨(eyebrow), 캡션, 비활성 */

  /* ---------- Surfaces ---------- */
  --color-bg:             #FFFFFF;  /* 기본 배경 */
  --color-surface:        #F8FAFC;  /* 섹션 옅은 배경 */
  --color-surface-2:      #F4F5F7;  /* 카드 배경 (살짝 진한 회색) */
  --color-surface-warm:   #F5F4F1;  /* 웜톤 카드 배경 */
  --color-border:         #E5E9F0;  /* 경계선, 구분선 */
  --color-border-strong:  #D5DBE5;  /* 강한 경계선 */

  /* ---------- Accent (지표/강조 숫자) ---------- */
  --color-green:          #059669;  /* +25% 같은 긍정 지표 */
  --color-blue-accent:    #2563EB;  /* +22% */
  --color-purple:         #7C3AED;  /* 2 hours 등 */

  /* ---------- Pastel Card Backgrounds ---------- */
  --pastel-cream:         #F5F3EE;  /* 크림/베이지 */
  --pastel-blue:          #ECF2FB;  /* 라이트 블루 */
  --pastel-lavender:      #F1ECFA;  /* 라벤더 */

  /* ---------- Dark Section (enterprise security 등) ---------- */
  --color-dark:           #0B1533;  /* 다크 네이비 배경 */
  --color-dark-surface:   #16203F;  /* 다크 섹션 내부 카드 */
  --color-dark-text:      #E2E8F0;  /* 다크 위 텍스트 */
  --color-dark-muted:     #94A3B8;
}
```

### 그라디언트 (Gradients)

```css
:root {
  /* 히어로 배경: 상단은 옅은 블루, 아래로 화이트 */
  --gradient-hero: radial-gradient(120% 80% at 50% 0%,
                    #EAF2FF 0%, #F5F9FF 40%, #FFFFFF 100%);

  /* 코너 장식용 블루 블롭 (히어로 좌우 하단, 다크섹션 등) */
  --gradient-blob: linear-gradient(135deg, #4E9CFF 0%, #2563EB 60%, #1E40AF 100%);

  /* 로고 아이콘 / 시그니처 원형 노드 */
  --gradient-brand: linear-gradient(135deg, #7DB0FF 0%, #2563EB 100%);

  /* 라벤더 히어로 박스 (AI 어시스턴트 섹션) */
  --gradient-soft-lavender: linear-gradient(180deg, #F3F0FB 0%, #F7F9FF 100%);
}
```

> **팁:** 컬러 지표 카드(초록/파랑/보라)는 이 사이트의 인상을 결정하는 요소입니다.
> 배경은 해당 색의 아주 옅은 파스텔, 숫자는 진한 채도색으로 대비를 줍니다.

---

## 2. 타이포그래피 (Typography)

### 2-1. 폰트 선택

원본 헤딩은 **기하학적 그로테스크(geometric grotesque)** 계열입니다.
`a` `e` `o`가 둥글고, 자간이 살짝 좁으며, 굵기는 미디엄~세미볼드입니다.
(원본은 *PP Neue Montreal* 계열로 추정되나 유료 폰트입니다.)

**무료 대체 조합 (Google Fonts / 무료):**

| 역할 | 추천 폰트 | 특징 |
|------|----------|------|
| **Display / 헤딩** | `Hanken Grotesk`, `General Sans`, `Instrument Sans` | 기하학적, 모던, 원본 느낌에 가장 근접 |
| **Body / 본문·UI** | `Inter` | 중립적이고 가독성 높은 UI 표준 폰트 |
| **한글** | `Pretendard` | 위 라틴 폰트들과 톤이 잘 맞는 한국형 무료 폰트 |

```css
/* Google Fonts import 예시 */
@import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
/* Pretendard: https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css */

:root {
  --font-display: 'Hanken Grotesk', 'Pretendard', system-ui, sans-serif;
  --font-body:    'Inter', 'Pretendard', system-ui, sans-serif;
}
```

### 2-2. 타입 스케일 (반응형)

```css
:root {
  --text-hero:  clamp(2.75rem, 5.5vw, 4.75rem);  /* H1 히어로  ~44→76px */
  --text-h2:    clamp(2rem,   3.6vw, 3.25rem);   /* 섹션 제목  ~32→52px */
  --text-h3:    1.5rem;                          /* 24px 카드/블록 제목 */
  --text-lg:    1.25rem;                         /* 20px 리드 문장 */
  --text-body:  1.0625rem;                       /* 17px 본문 */
  --text-sm:    0.9375rem;                       /* 15px 보조 */
  --text-xs:    0.8125rem;                       /* 13px 라벨·캡션 */
}
```

### 2-3. 스타일 규칙

```css
/* 히어로 헤딩 */
.h1 {
  font-family: var(--font-display);
  font-size: var(--text-hero);
  font-weight: 600;
  line-height: 1.05;
  letter-spacing: -0.02em;
  color: var(--color-text);
}

/* 섹션 헤딩 (예: "Move every deal forward in one shared space.") */
.h2 {
  font-family: var(--font-display);
  font-size: var(--text-h2);
  font-weight: 500;          /* 원본은 헤딩이 과하게 굵지 않음 */
  line-height: 1.12;
  letter-spacing: -0.015em;
  color: var(--color-text);
}

/* 리드 / 서브 문장 */
.lead {
  font-family: var(--font-body);
  font-size: var(--text-lg);
  line-height: 1.5;
  color: var(--color-text-body);
}

/* 본문 */
.body {
  font-family: var(--font-body);
  font-size: var(--text-body);
  line-height: 1.6;
  color: var(--color-text-body);
}

/* Eyebrow(섹션 위 작은 라벨): "Client Workspaces", "Dock AI" 등 */
.eyebrow {
  font-family: var(--font-body);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-muted);
  margin-bottom: 12px;
}
```

> **핵심 포인트**
> - 헤딩은 **굵기보다 크기로** 존재감을 냄 (weight 500~600 정도).
> - 자간을 살짝 **음수(-0.015~-0.02em)** 로 조여 모던한 인상.
> - 본문 line-height는 넉넉히 **1.6**.

---

## 3. 여백 · 레이아웃 (Spacing & Layout)

### 3-1. 스페이싱 스케일 (8px 기반)

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-30: 120px;
}
```

### 3-2. 컨테이너 & 섹션

```css
:root {
  --container-max: 1200px;                        /* 콘텐츠 최대 폭 */
  --gutter: 24px;                                 /* 좌우 여백 */
  --section-py: clamp(64px, 9vw, 120px);          /* 섹션 상하 패딩 */
  --card-gap: 24px;                               /* 카드 사이 간격 */
}

.container {
  width: 100%;
  max-width: var(--container-max);
  margin-inline: auto;
  padding-inline: var(--gutter);
}

.section {
  padding-block: var(--section-py);
}
```

### 3-3. 대표 레이아웃 패턴

**A. 히어로 (중앙 정렬 + 제품 목업)** — *이미지 10*
```
┌─────────────────────────────────────────────┐
│                  [ 상단 네비 ]                │
│                                               │
│              큰 헤딩 (2줄, 중앙)              │
│              서브 문장 (중앙)                 │
│         [ Request Demo ] [ Start for Free ]   │
│                                               │
│         ── 탭 네비 (7개 기능 탭) ──           │
│      ┌───────── 제품 목업 프레임 ─────────┐   │
│      │                                    │   │
└──────┴────────────────────────────────────┴───┘
   ↑ 좌우 하단에 블루 그라디언트 블롭
```

**B. 텍스트 좌 / 비주얼 우 (Split)** — *이미지 6, 8*
```
┌──────────────────┬────────────────────────────┐
│ eyebrow          │                            │
│ 큰 헤딩 (2줄)    │      제품 목업 / 다이어그램  │
│                  │      (옅은 배경 카드 안)     │
│ ├ 기능 블록 1    │                            │
│ ├ 기능 블록 2    │                            │
└──────────────────┴────────────────────────────┘
```

**C. 가로 스크롤 카드 (Carousel)** — *이미지 5, 1*
```
eyebrow
큰 헤딩
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌──────
│ [목업]  │ │ [목업]  │ │ [목업]  │ │ [목업]
│ 제목    │ │ 제목    │ │ 제목    │ │ 제목
│ 설명    │ │ 설명    │ │ 설명    │ │ 설명
└─────────┘ └─────────┘ └─────────┘ └──────
                              ( ‹ )  ( › )  ← 우측 하단 화살표
```

**D. 3열 균등 카드 (Grid)** — *이미지 4, 9*
```
eyebrow / 헤딩 (좌측 정렬 또는 중앙)
┌───────────┐ ┌───────────┐ ┌───────────┐
│           │ │           │ │           │
│  카드 1   │ │  카드 2   │ │  카드 3   │
│           │ │           │ │           │
└───────────┘ └───────────┘ └───────────┘
```

---

## 4. 모서리 · 그림자 (Radius & Shadow)

```css
:root {
  /* Border Radius */
  --radius-sm:   8px;    /* 작은 요소, 입력창 */
  --radius-md:   12px;   /* 목업 프레임, 중간 카드 */
  --radius-lg:   16px;   /* 일반 카드 */
  --radius-xl:   24px;   /* 큰 지표 카드, 히어로 박스 */
  --radius-full: 9999px; /* 버튼, 태그, 칩 (알약형) */

  /* Shadow — 아주 옅게, 최소한의 입체감만 */
  --shadow-xs: 0 1px 2px rgba(15, 23, 42, 0.04);
  --shadow-sm: 0 2px 8px rgba(15, 23, 42, 0.05);
  --shadow-md: 0 6px 20px rgba(15, 23, 42, 0.06);
  --shadow-lg: 0 16px 48px rgba(15, 23, 42, 0.08);
}
```

> 그림자는 **거의 안 보일 정도로 옅게**. 이 디자인은 그림자보다 **경계선(1px)** 과
> **배경 색 대비**로 요소를 구분하는 편입니다.

---

## 5. 컴포넌트 스펙 (Components)

### 5-1. 버튼 (Buttons)

두 종류 + 알약 형태가 기본. Primary에는 화살표(→) 자주 사용.

```css
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-body);
  font-size: var(--text-body);
  font-weight: 500;
  padding: 12px 22px;
  border-radius: var(--radius-full);
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.18s ease;
  text-decoration: none;
}

/* Primary — 채도 높은 블루 */
.btn-primary {
  background: var(--color-primary);
  color: #FFFFFF;
}
.btn-primary:hover {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
}

/* Secondary — 화이트 + 얇은 테두리 */
.btn-secondary {
  background: #FFFFFF;
  color: var(--color-text);
  border-color: var(--color-border-strong);
}
.btn-secondary:hover {
  background: var(--color-surface);
}

/* 텍스트 링크형 ("How they did it →") */
.btn-link {
  background: transparent;
  color: var(--color-text);
  padding: 8px 16px;
  border: 1px solid var(--color-border);
}
```

```html
<a class="btn btn-secondary">Request Demo</a>
<a class="btn btn-primary">Start for Free →</a>
```

---

### 5-2. 상단 네비게이션 (Navbar)

```css
.navbar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
  padding-inline: var(--gutter);
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);          /* 스크롤 시 반투명 유리 효과 */
  border-bottom: 1px solid transparent;
}

.navbar__logo { display: flex; align-items: center; gap: 8px; font-weight: 600; }
.navbar__links { display: flex; gap: 28px; }
.navbar__links a {
  color: var(--color-text);
  font-size: var(--text-body);
  font-weight: 500;
  text-decoration: none;
}
.navbar__actions { display: flex; align-items: center; gap: 12px; }
```

구조: `로고(좌) — 링크(Product▾ · Pricing · Customers · Resources▾) — 우측 액션(Log in · Request Demo · Start for Free)`

---

### 5-3. Eyebrow 라벨 + 섹션 헤딩

거의 모든 섹션이 **[작은 회색 라벨] → [큰 헤딩]** 구조로 시작합니다.

```html
<div class="section">
  <div class="container">
    <p class="eyebrow">Client Workspaces</p>
    <h2 class="h2">Move every deal forward<br>in one shared space.</h2>
  </div>
</div>
```

> 헤딩은 2줄로 의도적으로 줄바꿈(`<br>`)해 리듬을 만듭니다.

---

### 5-4. 기능 카드 (Feature Card) — *이미지 4, 5*

목업/일러스트 상단 + 제목 + 설명.

```css
.feature-card {
  background: var(--color-surface-2);
  border-radius: var(--radius-lg);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.feature-card__visual {           /* 목업 영역 */
  background: #FFFFFF;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  aspect-ratio: 16 / 10;
  overflow: hidden;
}
.feature-card__title {
  font-family: var(--font-display);
  font-size: var(--text-h3);
  font-weight: 500;
  color: var(--color-text);
}
.feature-card__desc {
  font-size: var(--text-body);
  line-height: 1.6;
  color: var(--color-text-body);
}
```

---

### 5-5. 지표 카드 (Metric Card) — *이미지 9* ⭐ 시그니처

파스텔 배경 + 큰 컬러 숫자 + "How they did it →".

```css
.metric-card {
  border-radius: var(--radius-xl);
  padding: 32px;
  min-height: 360px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
/* 색상 변형 */
.metric-card--cream    { background: var(--pastel-cream); }
.metric-card--blue     { background: var(--pastel-blue); }
.metric-card--lavender { background: var(--pastel-lavender); }

.metric-card__number {
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 4vw, 3.5rem);
  font-weight: 600;
  line-height: 1;
}
.metric-card--cream    .metric-card__number { color: var(--color-green); }
.metric-card--blue     .metric-card__number { color: var(--color-blue-accent); }
.metric-card--lavender .metric-card__number { color: var(--color-purple); }

.metric-card__label {          /* 숫자 아래 큰 검정 텍스트 */
  font-family: var(--font-display);
  font-size: clamp(1.75rem, 2.5vw, 2.25rem);
  font-weight: 500;
  color: var(--color-text);
}
```

```html
<div class="metric-card metric-card--cream">
  <div><span class="logo">Lattice</span> <span class="tag">Sales</span></div>
  <div>
    <div class="metric-card__number">+25%</div>
    <div class="metric-card__label">win rate</div>
  </div>
  <a class="btn btn-link">How they did it →</a>
</div>
```

---

### 5-6. 태그 / 칩 (Tags & Chips) — *이미지 2, 7*

필터 태그, 액션 칩 모두 알약형.

```css
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: var(--radius-full);
  background: #FFFFFF;
  border: 1px solid var(--color-border);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text);
  cursor: pointer;
}
.chip:hover { background: var(--color-surface); }
.chip--active {                  /* 선택된 필터 */
  background: var(--color-primary-soft);
  border-color: var(--color-primary);
  color: var(--color-primary);
}
```

---

### 5-7. 제품 목업 프레임 (Product Frame) — *이미지 8, 10*

실제 UI 스크린샷을 감싸는 프레임. 상단 탭 네비와 함께 자주 등장.

```css
.product-frame {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 12px;
  box-shadow: var(--shadow-md);
}
.product-frame__inner {
  background: #FFFFFF;
  border-radius: var(--radius-md);
  overflow: hidden;
}

/* 목업 위 탭 네비 (Deal Rooms · Onboarding · Client Portal) */
.frame-tabs {
  display: flex;
  gap: 24px;
  justify-content: center;
  padding: 12px 0;
}
.frame-tabs a { color: var(--color-text-muted); font-size: var(--text-sm); }
.frame-tabs a.is-active {
  color: var(--color-text);
  background: var(--color-surface-2);
  padding: 4px 12px;
  border-radius: var(--radius-full);
}
```

---

### 5-8. 다크 섹션 (Dark Section) — *이미지 1*

보안/신뢰 강조 구간. 다크 네이비 배경에 밝은 텍스트.

```css
.section--dark {
  background: var(--color-dark);
  color: var(--color-dark-text);
  border-radius: var(--radius-xl);   /* 섹션 전체를 둥근 블록으로 */
  padding: clamp(48px, 6vw, 80px);
}
.section--dark .eyebrow { color: var(--color-dark-muted); }
.section--dark .h2      { color: #FFFFFF; }
```

배지(SOC 2 Type 2, GDPR 등)는 원형 아이콘 + 라벨로 나란히 배치.

---

### 5-9. 로고 바 (Logo Strip) — *이미지 9*

"Revenue teams love Dock" + 고객사 로고 나열. 로고는 **단색 그레이**로 통일해 톤 유지.

```css
.logo-strip {
  display: flex;
  align-items: center;
  gap: 40px;
  flex-wrap: wrap;
  opacity: 0.75;                    /* 로고는 살짝 흐리게 */
}
.logo-strip img { height: 24px; filter: grayscale(1); }
```

---

## 6. 시그니처 요소 (Signature Elements)

이 사이트를 "기억되게" 만드는 요소들입니다. 하나만 골라 차용해도 개성이 살아납니다.

1. **오빗형 원형 다이어그램** (*이미지 3*)
   - 중앙 그라디언트 노드(브랜드) + 궤도 위 데이터 소스 노드들.
   - 각 노드는 화이트 알약 라벨 + 컬러 아이콘. 궤도선은 옅은 점선.
   - "우리 제품이 여러 소스를 연결한다"를 시각적으로 표현할 때 강력.

2. **파스텔 지표 카드 3열** (*이미지 9*) — 위 5-5 참고. 성과/숫자 강조에 최적.

3. **제품 목업 프레임 + 탭 전환** (*이미지 8, 10*)
   - 실제 UI를 프레임에 넣고, 탭으로 여러 기능을 한 자리에서 보여줌.

4. **채팅형 AI 어시스턴트 목업** (*이미지 7*)
   - 라벤더 그라디언트 박스 + 입력창 + 액션 칩 그리드.

---

## 7. 모션 · 인터랙션 (Motion)

절제된 마이크로 인터랙션 위주. 과한 애니메이션은 지양.

```css
:root { --ease: cubic-bezier(0.2, 0.8, 0.2, 1); }

/* 공통 hover */
.btn, .feature-card, .chip { transition: all 0.18s var(--ease); }

/* 카드 hover 시 아주 살짝 떠오름 */
.feature-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }

/* 스크롤 진입 시 fade-up (JS로 .in-view 토글) */
.reveal { opacity: 0; transform: translateY(16px); transition: 0.6s var(--ease); }
.reveal.in-view { opacity: 1; transform: none; }

/* 접근성: 모션 최소화 존중 */
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

---

## 8. 적용 체크리스트 (Implementation Checklist)

내 사이트에 옮길 때 순서대로 확인하세요.

- [ ] **컬러 토큰**을 `:root`에 붙여넣고 브랜드 블루만 내 색으로 교체
- [ ] **폰트** 로드 (Hanken Grotesk + Inter + Pretendard) 및 `--font-*` 연결
- [ ] **타입 스케일**(clamp) 적용 → 헤딩을 과감하게 크게
- [ ] 헤딩 굵기 500~600, 자간 `-0.015~-0.02em` 확인
- [ ] 버튼·태그를 **알약형**(`--radius-full`)으로 통일
- [ ] 카드 모서리 16~24px, 그림자는 **아주 옅게**
- [ ] 섹션마다 **eyebrow → 큰 헤딩** 구조 유지
- [ ] 성과 구간에 **파스텔 지표 카드** 도입
- [ ] 로고 바는 **그레이스케일 + opacity 0.75**
- [ ] 반응형: 모바일에서 3열 → 1열, 히어로 폰트 자동 축소(clamp)
- [ ] 접근성: 키보드 포커스 표시, `prefers-reduced-motion` 존중

---

## 9. 최소 시작 템플릿 (Copy-Paste Starter)

```html
<section class="section" style="background: var(--gradient-hero);">
  <div class="container" style="text-align:center; max-width:820px;">
    <h1 class="h1">Enablement that<br>sellers and buyers love</h1>
    <p class="lead" style="margin:20px auto 0; max-width:560px;">
      한 문장으로 제품 가치를 설명하는 서브 카피를 여기에.
    </p>
    <div style="display:flex; gap:12px; justify-content:center; margin-top:28px;">
      <a class="btn btn-secondary">Request Demo</a>
      <a class="btn btn-primary">Start for Free →</a>
    </div>
  </div>
</section>
```

---

### 참고 (Notes)
- 색상/폰트는 스크린샷 기반 추정치입니다. 브랜드에 맞게 `--color-primary` 한 값만 바꿔도 전체 톤이 유지되도록 토큰화했습니다.
- 원본 폰트가 꼭 필요하면 *PP Neue Montreal*(유료) 계열을 확인해 보세요. 무료로는 *Hanken Grotesk / General Sans*가 가장 가깝습니다.
- 이 문서의 CSS 변수·컴포넌트는 순수 CSS라 React·Vue·플레인 HTML 어디에나 그대로 이식 가능합니다.
