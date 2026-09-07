-- ============================================================
-- 챕터 4 '소싱 앱 소개'(slug=sourcing) 본문 교체
--  · 소메뉴 2개: AutoDS(13스텝) / Zendrop(설치 5스텝 + 기능 정리)
--  · 각 앱 data-subnav 앵커 → 사이드바 소메뉴
--  Supabase SQL Editor 에서 실행. (이미지는 배포로 함께: manual/images/source-autods-*, source-zendrop-*)
-- ============================================================
update public.manual_chapters set body = $body$<h3 class="subhead">소싱 앱 소개</h3>
<div class="callout overview"><div class="callout-label">이 챕터 개요</div><p><b>소싱 앱</b>은 판매할 상품을 찾아 Shopify 스토어로 업로드하고, 주문이 들어오면 발주까지 도와주는 도구입니다. 여기서는 <b>AutoDS</b>와 <b>Zendrop</b> 두 가지를 소개합니다. 흐름(상품 찾기 → 수정 → 업로드 → 주문 처리)은 비슷하니 <b>편한 것 하나</b>를 골라 쓰면 됩니다.</p></div>


<h3 class="subsection" id="source-autods" data-subnav="AutoDS">AutoDS 사용 방법</h3>
<div class="callout note"><div class="callout-label">💡 전체 흐름</div><p>상품 찾기 → 상품 정보 확인 → <b>Drafts</b>에 저장 → 정보 수정 → 가격·옵션 설정 → Shopify로 업로드 → Shopify에서 확인. 처음에는 <b>Marketplace → Drafts → Products → Orders</b> 순서만 이해해도 충분합니다.</p></div>

<div class="step"><span class="step-badge">STEP 1</span><span class="step-title">메인 화면 이해하기</span></div>
<p>AutoDS는 상품을 찾고·가져오고·수정해 Shopify로 업로드하는 도구입니다. 왼쪽 메뉴가 어떤 역할인지만 먼저 익히세요.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-autods-01.png" alt=""></figure>
<ul class="bullets"><li><b>Dashboard</b> — 스토어 전체 현황·주요 지표</li><li><b>Products</b> — 저장·업로드한 상품 관리</li><li><b>Drafts</b> — 업로드 전 상품 임시 보관·수정</li><li><b>Orders</b> — 주문 내역·처리 상태</li><li><b>Marketplace</b> — 판매할 상품 찾기</li><li><b>Settings</b> — 스토어 연결·가격 규칙·자동화 설정</li></ul>

<div class="step"><span class="step-badge">STEP 2</span><span class="step-title">Shopify 스토어 연결하기</span></div>
<p>AutoDS에서 찾은 상품을 올리려면 먼저 Shopify와 연결해야 합니다. (처음 한 번만 하면 됩니다.)</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-autods-02.png" alt=""></figure>
<ul class="bullets"><li><b>Add Store</b> — 새 스토어 연결</li><li><b>Shopify 선택</b> → <b>스토어 주소 입력</b> → <b>Connect Store</b></li><li>Shopify 관리자에서 AutoDS 앱 <b>권한 승인</b></li></ul>

<div class="step"><span class="step-badge">STEP 3</span><span class="step-title">상품 검색으로 수집하기</span></div>
<p><b>Marketplace</b>에서 판매할 상품을 직접 검색합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-autods-03.png" alt=""></figure>
<ul class="bullets"><li>검색창에 <b>구체적인 키워드</b> 입력 (예: <code>lamp</code>보다 <code>LED desk lamp</code>, <code>toy</code>보다 <code>dog toy</code>)</li><li><b>Search</b> 버튼 → 상품 목록 확인</li></ul>

<div class="step"><span class="step-badge">STEP 4</span><span class="step-title">필터로 조건 좁히기</span></div>
<p>결과가 많으면 필터로 원하는 조건만 좁혀서 봅니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-autods-04.png" alt=""></figure>
<ul class="bullets"><li><b>카테고리 · 배송 국가 · 배송 기간 · 가격 범위 · 공급처 · 정렬 기준</b></li><li>처음엔 <b>배송 기간이 짧고 가격이 과하지 않은</b> 상품부터 확인</li></ul>

<div class="step"><span class="step-badge">STEP 5</span><span class="step-title">상품 카드 정보 확인하기</span></div>
<p>이미지만 보지 말고 카드의 정보를 함께 봅니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-autods-05.png" alt=""></figure>
<ul class="bullets"><li><b>상품명 · 이미지 · 원가/판매가 · 배송 기간 · 평점/리뷰 · 공급처</b></li><li>로고·브랜드명·워터마크가 있는 이미지는 신중히</li><li><b>Import</b> — 마음에 드는 상품 가져오기</li></ul>

<div class="step"><span class="step-badge">STEP 6</span><span class="step-title">마음에 드는 상품 저장하기</span></div>
<p>바로 Shopify로 올리지 말고 먼저 AutoDS <b>Drafts</b>에 저장합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-autods-06.png" alt=""></figure>
<ul class="bullets"><li><b>Import</b> 또는 <b>Add to Drafts</b> → <b>Drafts</b>에 저장</li><li>Drafts에서 제목·설명·이미지·가격·옵션을 수정한 뒤 업로드</li></ul>

<div class="step"><span class="step-badge">STEP 7</span><span class="step-title">트렌드 상품으로 소싱하기</span></div>
<p>무엇을 팔지 모르겠다면 <b>Trending Products</b>(인기 상품)를 참고합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-autods-07.png" alt=""></figure>
<ul class="bullets"><li>카테고리·정렬로 인기 상품 탐색 → <b>Import</b></li><li>인기 상품이라도 <b>가격·배송·이미지·옵션</b>을 함께 확인</li><li>생활용품·반려동물·홈&가든처럼 이해 쉬운 카테고리부터</li></ul>

<div class="step"><span class="step-badge">STEP 8</span><span class="step-title">트렌드 상품 비교 후 가져오기</span></div>
<p>상위 상품을 비교해 판매 가능성이 있는 것을 저장합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-autods-08.png" alt=""></figure>
<ul class="bullets"><li><b>상품명 · 가격 · 주문 수 · 평점/리뷰 · 배송 시간</b> 확인</li><li>무겁거나 깨지기 쉬운 상품, 브랜드·캐릭터 상품은 초보에게 부담</li><li>괜찮으면 <b>Import</b></li></ul>

<div class="step"><span class="step-badge">STEP 9</span><span class="step-title">상품 URL로 직접 가져오기</span></div>
<p>검색에 안 나오거나 다른 쇼핑몰의 상품을 가져올 때는 상품 URL을 사용합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-autods-09.png" alt=""></figure>
<ul class="bullets"><li><b>Product URL</b>에 상품 <b>상세페이지</b> 주소 붙여넣기 (메인 주소 X)</li><li><b>공급처 선택</b> → <b>Import Product</b> → Drafts 저장</li><li>Amazon·AliExpress·Walmart 등의 상세페이지 URL 사용 가능</li></ul>

<div class="step"><span class="step-badge">STEP 10</span><span class="step-title">Drafts에서 상품 확인하기</span></div>
<p>가져온 상품은 Drafts에 저장됩니다. 여기서 확인·수정 후 업로드합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-autods-10.png" alt=""></figure>
<ul class="bullets"><li>수정할 상품 선택 → 편집 → <b>Upload</b>로 Shopify 전송</li><li>가져온 직후 바로 업로드하지 말고 제목·설명·이미지·가격·옵션 확인</li></ul>

<div class="step"><span class="step-badge">STEP 11</span><span class="step-title">상품 제목·설명 수정하기</span></div>
<p>고객이 보기 쉽게 제목과 설명을 정리합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-autods-11.png" alt=""></figure>
<ul class="bullets"><li><b>제목</b>은 짧고 명확하게, <b>설명</b>은 특징·용도·장점 정리</li><li>이미지의 로고·워터마크·브랜드명 확인</li><li>카테고리·태그 설정 후 <b>Save</b> 필수</li></ul>

<div class="step"><span class="step-badge">STEP 12</span><span class="step-title">가격·재고·옵션 설정 후 업로드</span></div>
<p>업로드 전 가격·재고·옵션을 확인합니다. 잘못 입력하면 주문 후 문의·취소가 생깁니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-autods-12.png" alt=""></figure>
<ul class="bullets"><li><b>판매가 · 비교가 · 원가 · 재고 · 옵션(색상/사이즈) · 배송 정보</b></li><li>판매가는 원가+배송비+광고비+수수료를 고려</li><li><b>Upload to Store</b>로 Shopify 업로드</li></ul>

<div class="step"><span class="step-badge">STEP 13</span><span class="step-title">Shopify에서 등록 확인하기</span></div>
<p>Shopify에 정상 등록됐는지 확인합니다. 등록돼도 <b>비활성</b>이면 고객이 볼 수 없어요.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-autods-13.png" alt=""></figure>
<ul class="bullets"><li>Shopify <b>상품</b> 메뉴에서 업로드된 상품 확인</li><li>상태 <b>활성</b> + <b>온라인 스토어</b> 판매 채널 연결 확인</li><li>재고가 있는지 확인</li></ul>

<h3 class="subhead">AutoDS 최종 체크리스트</h3>
<ul class="bullets"><li>상품명이 너무 길지 않은지 / 설명이 이해하기 쉬운지</li><li>이미지가 선명하고 로고·브랜드명 문제가 없는지</li><li>판매가·비교가·재고·옵션이 올바른지</li><li>배송 기간이 너무 길지 않은지</li><li>Drafts에서 수정 후 업로드했는지</li><li>Shopify에서 상태가 <b>활성</b>인지</li></ul>


<h3 class="subsection" id="source-zendrop" data-subnav="Zendrop">Zendrop 사용 방법</h3>
<div class="callout note"><div class="callout-label">💡 Zendrop이란</div><p>Shopify와 연동해 상품을 검색·업로드하고, 주문 발생 후 <b>발주(풀필먼트)</b>까지 진행할 수 있는 소싱 앱입니다.</p></div>

<div class="step"><span class="step-badge">설치 1</span><span class="step-title">쇼피파이 상단 검색 클릭</span></div>
<p>쇼피파이에 접속한 뒤 상단 <b>검색</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-zendrop-01.png" alt=""></figure>

<div class="step"><span class="step-badge">설치 2</span><span class="step-title">"앱" 클릭</span></div>
<p><b>앱</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-zendrop-02.png" alt=""></figure>

<div class="step"><span class="step-badge">설치 3</span><span class="step-title">Zendrop 검색</span></div>
<p><b>Zendrop</b>을 검색한 뒤, 하단에 뜨는 <b>Zendrop: AI Dropshipping &amp; POD</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-zendrop-03.png" alt=""></figure>

<div class="step"><span class="step-badge">설치 4</span><span class="step-title">설치 클릭</span></div>
<p><b>설치</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-zendrop-04.png" alt=""></figure>

<div class="step"><span class="step-badge">설치 5</span><span class="step-title">설치 완료</span></div>
<p>이어지는 화면에서 <b>설치</b>를 한 번 더 클릭해 완료합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-zendrop-05.png" alt=""></figure>
<div class="callout overview"><div class="callout-label">✅ 설치 확인</div><p>Shopify 왼쪽 <b>Apps</b> → <b>Zendrop</b> 클릭 → 대시보드로 이동되고, 왼쪽에 <b>Dashboard · Find Products · Trending Products · My Products · Orders</b> 메뉴가 보이면 정상입니다.</p></div>

<h3 class="subhead">Dashboard — 전체 현황</h3>
<p>Zendrop의 메인 화면으로 매출·주문 수·미처리 주문 등을 봅니다. 실제 작업은 아래 메뉴에서 합니다.</p>
<ul class="bullets"><li><b>Find Products</b> — 판매할 상품 직접 검색</li><li><b>Trending Products</b> — 추천 인기 상품</li><li><b>My Products</b> — 내가 추가한 상품 확인·수정</li><li><b>Orders</b> — 주문 발생 후 발주·상태 확인</li></ul>

<h3 class="subhead">Find Products — 상품 검색</h3>
<p>왼쪽 <b>Find Products</b>에서 키워드로 상품을 검색하고 <b>My Products</b>에 추가합니다.</p>
<ul class="bullets"><li>키워드 예시: beauty · kitchen · pet · storage · lamp · home decor</li><li>이미지 품질, 배송 가능 국가, 원가 대비 판매가 확인</li><li>브랜드 로고·캐릭터 등 저작권 문제 상품은 피하기</li></ul>

<h3 class="subhead">Trending Products — 인기 상품</h3>
<p>고르기 어려우면 추천 인기 상품을 참고해 <b>My Products</b>에 추가합니다.</p>
<ul class="bullets"><li>인기 상품이라도 스토어 콘셉트·타깃·가격 경쟁력·배송 기간을 함께 확인</li></ul>

<h3 class="subhead">My Products — 상품 수정</h3>
<p>업로드 전 상품명·가격·이미지·설명·옵션을 정리합니다.</p>
<ul class="bullets"><li>상품명: 너무 길면 짧게, 번역체는 자연스럽게, 브랜드·과장 표현 제거, 핵심 키워드 포함</li><li>판매가 설정 · 불필요한 이미지 제외 · 설명 수정 · 옵션(색상/사이즈/수량) 확인</li><li>최종 확인 후 Shopify로 업로드</li></ul>

<h3 class="subhead">Shopify로 업로드 & 확인</h3>
<p>수정한 상품을 Shopify로 보낸 뒤 관리자 <b>Products</b>에서 확인합니다.</p>
<ul class="bullets"><li>상품명·이미지·판매가·옵션이 정상 반영됐는지</li><li>상태가 <b>Active</b>인지, 적절한 컬렉션에 연결됐는지</li></ul>

<h3 class="subhead">Orders — 주문 처리(발주)</h3>
<p>Shopify에서 주문이 들어오면 <b>Orders</b>에서 발주·배송 상태를 확인합니다.</p>
<ul class="bullets"><li>주문 상품·고객 주소·결제 상태 확인 → 개별 주문부터 발주</li><li>추적번호 생성 시 Shopify 주문에 반영됐는지 확인</li><li><b>Fulfill all</b>(일괄 처리)은 익숙해진 뒤 사용 권장</li></ul>

<div class="callout overview"><div class="callout-label">✅ 핵심 정리</div><p>상품 검색은 <b>Find Products</b>, 인기 상품은 <b>Trending Products</b>, 상품 수정은 <b>My Products</b>, 주문 처리는 <b>Orders</b>에서 진행합니다. 업로드 전에는 상품명·이미지·마진·배송국가·옵션을, 발주 전에는 주소·결제·배송국가·추적번호를 꼭 확인하세요.</p></div>
$body$ where slug = 'sourcing';
