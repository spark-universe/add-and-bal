-- ============================================================
-- 챕터 4 '소싱 앱 소개'(slug=sourcing) 본문 교체
--  · 소메뉴 2개: AutoDS(13스텝) / Zendrop(설치 5스텝 + 사용 12스텝)
--  · 각 앱 data-subnav 앵커 → 사이드바 소메뉴
--  Supabase SQL Editor 에서 실행. (이미지는 배포로 함께: manual/images/source-autods-*, source-zendrop-*)
-- ============================================================
update public.manual_chapters set body = $body$<h3 class="subhead">소싱 앱 소개</h3>
<div class="callout overview"><div class="callout-label">이 챕터 개요</div><p><b>소싱 앱</b>은 판매할 상품을 찾아 Shopify 스토어로 업로드하고, 주문이 들어오면 발주까지 도와주는 도구입니다. 여기서는 <b>AutoDS</b>와 <b>Zendrop</b> 두 가지를 소개합니다. 흐름(상품 찾기 → 수정 → 업로드 → 주문 처리)은 비슷하니 <b>편한 것 하나</b>를 골라 쓰면 됩니다.</p></div>


<h3 class="subsection" id="source-autods" data-subnav="AutoDS">AutoDS 사용 방법</h3>
<div class="callout note"><div class="callout-label">💡 전체 흐름</div><p>상품 찾기 → 상품 정보 확인 → <b>Drafts</b>에 저장 → 정보 수정 → 가격·옵션 설정 → Shopify로 업로드 → Shopify에서 확인. 처음에는 <b>Marketplace → Drafts → Products → Orders</b> 순서만 이해해도 충분합니다.</p></div>

<div class="step"><span class="step-badge">STEP 1</span><span class="step-title">메인 화면 이해하기</span></div>
<p>AutoDS는 상품을 찾고·가져오고·수정해 Shopify로 업로드하는 도구입니다. 왼쪽 메뉴가 어떤 역할인지만 먼저 익히세요.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-autods-01.webp" alt=""></figure>
<ul class="bullets"><li><b>Dashboard</b> — 스토어 전체 현황·주요 지표</li><li><b>Products</b> — 저장·업로드한 상품 관리</li><li><b>Drafts</b> — 업로드 전 상품 임시 보관·수정</li><li><b>Orders</b> — 주문 내역·처리 상태</li><li><b>Marketplace</b> — 판매할 상품 찾기</li><li><b>Settings</b> — 스토어 연결·가격 규칙·자동화 설정</li></ul>

<div class="step"><span class="step-badge">STEP 2</span><span class="step-title">Shopify 스토어 연결하기</span></div>
<p>AutoDS에서 찾은 상품을 올리려면 먼저 Shopify와 연결해야 합니다. (처음 한 번만 하면 됩니다.)</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-autods-02.webp" alt=""></figure>
<ul class="bullets"><li><b>Add Store</b> — 새 스토어 연결</li><li><b>Shopify 선택</b> → <b>스토어 주소 입력</b> → <b>Connect Store</b></li><li>Shopify 관리자에서 AutoDS 앱 <b>권한 승인</b></li></ul>

<div class="step"><span class="step-badge">STEP 3</span><span class="step-title">상품 검색으로 수집하기</span></div>
<p><b>Marketplace</b>에서 판매할 상품을 직접 검색합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-autods-03.webp" alt=""></figure>
<ul class="bullets"><li>검색창에 <b>구체적인 키워드</b> 입력 (예: <code>lamp</code>보다 <code>LED desk lamp</code>, <code>toy</code>보다 <code>dog toy</code>)</li><li><b>Search</b> 버튼 → 상품 목록 확인</li></ul>

<div class="step"><span class="step-badge">STEP 4</span><span class="step-title">필터로 조건 좁히기</span></div>
<p>결과가 많으면 필터로 원하는 조건만 좁혀서 봅니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-autods-04.webp" alt=""></figure>
<ul class="bullets"><li><b>카테고리 · 배송 국가 · 배송 기간 · 가격 범위 · 공급처 · 정렬 기준</b></li><li>처음엔 <b>배송 기간이 짧고 가격이 과하지 않은</b> 상품부터 확인</li></ul>

<div class="step"><span class="step-badge">STEP 5</span><span class="step-title">상품 카드 정보 확인하기</span></div>
<p>이미지만 보지 말고 카드의 정보를 함께 봅니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-autods-05.webp" alt=""></figure>
<ul class="bullets"><li><b>상품명 · 이미지 · 원가/판매가 · 배송 기간 · 평점/리뷰 · 공급처</b></li><li>로고·브랜드명·워터마크가 있는 이미지는 신중히</li><li><b>Import</b> — 마음에 드는 상품 가져오기</li></ul>

<div class="step"><span class="step-badge">STEP 6</span><span class="step-title">마음에 드는 상품 저장하기</span></div>
<p>바로 Shopify로 올리지 말고 먼저 AutoDS <b>Drafts</b>에 저장합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-autods-06.webp" alt=""></figure>
<ul class="bullets"><li><b>Import</b> 또는 <b>Add to Drafts</b> → <b>Drafts</b>에 저장</li><li>Drafts에서 제목·설명·이미지·가격·옵션을 수정한 뒤 업로드</li></ul>

<div class="step"><span class="step-badge">STEP 7</span><span class="step-title">트렌드 상품으로 소싱하기</span></div>
<p>무엇을 팔지 모르겠다면 <b>Trending Products</b>(인기 상품)를 참고합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-autods-07.webp" alt=""></figure>
<ul class="bullets"><li>카테고리·정렬로 인기 상품 탐색 → <b>Import</b></li><li>인기 상품이라도 <b>가격·배송·이미지·옵션</b>을 함께 확인</li><li>생활용품·반려동물·홈&가든처럼 이해 쉬운 카테고리부터</li></ul>

<div class="step"><span class="step-badge">STEP 8</span><span class="step-title">트렌드 상품 비교 후 가져오기</span></div>
<p>상위 상품을 비교해 판매 가능성이 있는 것을 저장합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-autods-08.webp" alt=""></figure>
<ul class="bullets"><li><b>상품명 · 가격 · 주문 수 · 평점/리뷰 · 배송 시간</b> 확인</li><li>무겁거나 깨지기 쉬운 상품, 브랜드·캐릭터 상품은 초보에게 부담</li><li>괜찮으면 <b>Import</b></li></ul>

<div class="step"><span class="step-badge">STEP 9</span><span class="step-title">상품 URL로 직접 가져오기</span></div>
<p>검색에 안 나오거나 다른 쇼핑몰의 상품을 가져올 때는 상품 URL을 사용합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-autods-09.webp" alt=""></figure>
<ul class="bullets"><li><b>Product URL</b>에 상품 <b>상세페이지</b> 주소 붙여넣기 (메인 주소 X)</li><li><b>공급처 선택</b> → <b>Import Product</b> → Drafts 저장</li><li>Amazon·AliExpress·Walmart 등의 상세페이지 URL 사용 가능</li></ul>

<div class="step"><span class="step-badge">STEP 10</span><span class="step-title">Drafts에서 상품 확인하기</span></div>
<p>가져온 상품은 Drafts에 저장됩니다. 여기서 확인·수정 후 업로드합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-autods-10.webp" alt=""></figure>
<ul class="bullets"><li>수정할 상품 선택 → 편집 → <b>Upload</b>로 Shopify 전송</li><li>가져온 직후 바로 업로드하지 말고 제목·설명·이미지·가격·옵션 확인</li></ul>

<div class="step"><span class="step-badge">STEP 11</span><span class="step-title">상품 제목·설명 수정하기</span></div>
<p>고객이 보기 쉽게 제목과 설명을 정리합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-autods-11.webp" alt=""></figure>
<ul class="bullets"><li><b>제목</b>은 짧고 명확하게, <b>설명</b>은 특징·용도·장점 정리</li><li>이미지의 로고·워터마크·브랜드명 확인</li><li>카테고리·태그 설정 후 <b>Save</b> 필수</li></ul>

<div class="step"><span class="step-badge">STEP 12</span><span class="step-title">가격·재고·옵션 설정 후 업로드</span></div>
<p>업로드 전 가격·재고·옵션을 확인합니다. 잘못 입력하면 주문 후 문의·취소가 생깁니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-autods-12.webp" alt=""></figure>
<ul class="bullets"><li><b>판매가 · 비교가 · 원가 · 재고 · 옵션(색상/사이즈) · 배송 정보</b></li><li>판매가는 원가+배송비+광고비+수수료를 고려</li><li><b>Upload to Store</b>로 Shopify 업로드</li></ul>

<div class="step"><span class="step-badge">STEP 13</span><span class="step-title">Shopify에서 등록 확인하기</span></div>
<p>Shopify에 정상 등록됐는지 확인합니다. 등록돼도 <b>비활성</b>이면 고객이 볼 수 없어요.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-autods-13.webp" alt=""></figure>
<ul class="bullets"><li>Shopify <b>상품</b> 메뉴에서 업로드된 상품 확인</li><li>상태 <b>활성</b> + <b>온라인 스토어</b> 판매 채널 연결 확인</li><li>재고가 있는지 확인</li></ul>

<h3 class="subhead">AutoDS 최종 체크리스트</h3>
<ul class="bullets"><li>상품명이 너무 길지 않은지 / 설명이 이해하기 쉬운지</li><li>이미지가 선명하고 로고·브랜드명 문제가 없는지</li><li>판매가·비교가·재고·옵션이 올바른지</li><li>배송 기간이 너무 길지 않은지</li><li>Drafts에서 수정 후 업로드했는지</li><li>Shopify에서 상태가 <b>활성</b>인지</li></ul>


<h3 class="subsection" id="source-zendrop" data-subnav="Zendrop">Zendrop 사용 방법</h3>
<div class="callout note"><div class="callout-label">💡 Zendrop이란</div><p>Shopify와 연동해 상품을 검색·업로드하고, 주문 발생 후 <b>발주(풀필먼트)</b>까지 진행할 수 있는 소싱 앱입니다.</p></div>

<div class="step"><span class="step-badge">설치 1</span><span class="step-title">쇼피파이 상단 검색 클릭</span></div>
<p>쇼피파이에 접속한 뒤 상단 <b>검색</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-zendrop-01.webp" alt=""></figure>

<div class="step"><span class="step-badge">설치 2</span><span class="step-title">"앱" 클릭</span></div>
<p><b>앱</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-zendrop-02.webp" alt=""></figure>

<div class="step"><span class="step-badge">설치 3</span><span class="step-title">Zendrop 검색</span></div>
<p><b>Zendrop</b>을 검색한 뒤, 하단에 뜨는 <b>Zendrop: AI Dropshipping &amp; POD</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-zendrop-03.webp" alt=""></figure>

<div class="step"><span class="step-badge">설치 4</span><span class="step-title">설치 클릭</span></div>
<p><b>설치</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-zendrop-04.webp" alt=""></figure>

<div class="step"><span class="step-badge">설치 5</span><span class="step-title">설치 완료</span></div>
<p>이어지는 화면에서 <b>설치</b>를 한 번 더 클릭해 완료합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-zendrop-05.webp" alt=""></figure>
<div class="callout overview"><div class="callout-label">✅ 설치 확인</div><p>Shopify 왼쪽 <b>앱</b> → <b>Zendrop</b> 클릭 → 대시보드로 이동되고, 왼쪽에 <b>대시보드 · 상품 검색 · 내 상품 · 주문 · 상품 요청 · 트렌드 상품</b> 메뉴가 보이면 정상입니다.</p></div>

<h3 class="subhead">Zendrop 기본 개요</h3>

<div class="step"><span class="step-badge">STEP 1</span><span class="step-title">Zendrop 메인 화면 이해하기</span></div>
<p>Zendrop 메인 화면의 주요 영역과 메뉴 구성을 익힙니다. 처음에는 모든 기능을 외우기보다, <b>왼쪽 메뉴에서 어떤 작업을 하는지</b>만 먼저 익히면 됩니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-zendrop-use-01.webp" alt=""></figure>
<ul class="bullets"><li><b>대시보드</b> — 스토어 주요 지표·판매 현황·주문 수·추천 상품을 한눈에 확인</li><li><b>상품 검색</b> — 판매할 상품을 검색·필터링해 스토어에 추가할 상품 찾기</li><li><b>내 상품</b> — 저장한 상품 목록 관리, 상품명·가격·옵션 수정</li><li><b>주문</b> — 고객 주문 내역 확인, 주문 처리·배송 현황 관리</li><li><b>상품 요청</b> — 원하는 상품이 검색되지 않을 때 상품 링크를 넣어 새 상품 요청</li><li><b>트렌드 상품</b> — 현재 인기 있는 상품 확인, 소싱 아이디어 얻기</li><li><b>도움말 센터</b> — 자주 묻는 질문·사용 가이드·문의하기</li></ul>
<div class="callout note"><div class="callout-label">※ 참고</div><p>처음에는 <b>상품 검색 → 내 상품 → 주문</b> 이 세 가지 메뉴만 먼저 기억해도 충분합니다.</p></div>

<h3 class="subhead">수집 및 업로드</h3>
<div class="callout note"><div class="callout-label">💡 전체 흐름</div><p>상품 찾기 → 상품 정보 확인 → 상품 저장 → <b>내 상품</b>에서 수정 → 가격/옵션 설정 → <b>Shopify로 보내기</b> → Shopify에서 확인. Zendrop에서 상품을 찾아 Shopify로 업로드하는 전체 과정입니다.</p></div>

<div class="step"><span class="step-badge">STEP 2</span><span class="step-title">상품 검색으로 수집하기</span></div>
<p>판매할 상품을 직접 검색하는 단계입니다. 왼쪽 메뉴에서 <b>상품 검색</b>을 누르고, 검색창에 상품 키워드를 입력합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-zendrop-use-02.webp" alt=""></figure>
<ul class="bullets"><li><b>상품 검색</b> — 판매할 상품을 직접 찾는 메뉴</li><li><b>검색창</b> — 찾고 싶은 상품 키워드 입력</li><li><b>검색 버튼</b> — 키워드 입력 뒤 상품 목록 불러오기</li><li><b>상품 목록</b> — 검색 결과로 나온 상품 확인</li></ul>
<div class="callout note"><div class="callout-label">※ 참고</div><p>처음에는 <code>lamp</code>처럼 넓은 단어보다 <code>LED lamp</code>, <code>desk lamp</code>, <code>pet toy</code>처럼 <b>구체적인 키워드</b>로 검색하는 것이 좋습니다.</p></div>

<div class="step"><span class="step-badge">STEP 3</span><span class="step-title">필터로 상품 조건 좁히기</span></div>
<p>검색 결과가 너무 많을 때는 필터를 사용해 원하는 상품만 좁혀서 확인합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-zendrop-use-03.webp" alt=""></figure>
<ul class="bullets"><li><b>카테고리</b> — 원하는 상품 분야만 골라 관련 없는 상품 줄이기</li><li><b>배송 지역</b> — 판매하려는 국가로 배송 가능한 상품인지 확인</li><li><b>배송 기간</b> — 고객이 상품을 받기까지 걸리는 예상 기간</li><li><b>가격 범위</b> — 너무 비싸거나 너무 저렴한 상품 제외</li><li><b>필터 더보기</b> — 더 세부적인 조건으로 좁혀 보기</li></ul>
<div class="callout note"><div class="callout-label">※ 참고</div><p>처음에는 배송 기간이 너무 긴 상품보다 <b>5~12일 내외</b> 상품부터 확인하는 것이 좋습니다.</p></div>

<div class="step"><span class="step-badge">STEP 4</span><span class="step-title">상품 카드 정보 확인하기</span></div>
<p>상품을 고를 때는 이미지만 보는 것이 아니라, 상품 카드에 있는 정보를 함께 확인해야 합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-zendrop-use-04.webp" alt=""></figure>
<ul class="bullets"><li><b>상품명</b> — 고객이 이해하기 쉬운 상품명인지</li><li><b>상품 이미지</b> — 선명하고 깔끔한지</li><li><b>가격</b> — 판매가를 정할 때 참고하는 기본 가격</li><li><b>배송 기간</b> — 고객 만족도와 직결되므로 반드시 확인</li><li><b>평점</b> — 상품 신뢰도를 판단하는 기준</li><li><b>주문 수</b> — 실제로 반응이 있는 상품인지 참고</li><li><b>저장 버튼</b> — 마음에 드는 상품을 Zendrop에 저장</li></ul>
<div class="callout note"><div class="callout-label">※ 참고</div><p>이미지만 보고 고르지 말고 <b>가격·배송 기간·평점·주문 수</b>를 함께 확인하세요.</p></div>

<div class="step"><span class="step-badge">STEP 5</span><span class="step-title">마음에 드는 상품 저장하기</span></div>
<p>마음에 드는 상품을 찾았다면 먼저 Zendrop 안에 저장합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-zendrop-use-05.webp" alt=""></figure>
<ul class="bullets"><li><b>Import List에 추가</b> — 마음에 드는 상품 저장</li><li><b>상품 가져오기</b> — 상품을 Zendrop 안으로 가져오기</li><li><b>내 상품</b> — 저장한 상품을 나중에 확인·수정하는 메뉴</li></ul>
<div class="callout note"><div class="callout-label">※ 주의</div><p><b>Import List에 추가</b>나 <b>상품 가져오기</b>를 눌렀다고 바로 Shopify에 올라가는 것은 아닙니다. 먼저 Zendrop에 저장한 뒤 <b>내 상품</b> 메뉴에서 상품명·설명·가격·이미지·옵션을 수정해야 합니다. 저장 후에는 반드시 <b>내 상품</b>에서 상품이 잘 들어갔는지 확인하세요.</p></div>

<div class="step"><span class="step-badge">STEP 6</span><span class="step-title">트렌드 상품으로 소싱하기</span></div>
<p>어떤 상품을 팔아야 할지 모르겠다면 <b>트렌드 상품</b> 메뉴를 활용합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-zendrop-use-06.webp" alt=""></figure>
<ul class="bullets"><li><b>트렌드 상품</b> — 현재 반응이 좋은 인기 상품 확인</li><li><b>카테고리</b> — 분야별 인기 상품 나눠 보기</li><li><b>정렬 기준</b> — 판매 순위·인기 기준으로 확인</li><li><b>기간</b> — 최근 7일 등 기간 기준으로 반응 확인</li><li><b>국가 선택</b> — 특정 국가 기준 트렌드 상품 확인</li><li><b>상품 가져오기</b> — 판매 가능성이 있다고 판단한 상품 저장</li></ul>
<div class="callout note"><div class="callout-label">※ 참고</div><p>트렌드 상품은 참고용으로 좋지만, <b>가격·배송 기간·평점·주문 수</b>를 반드시 함께 확인하세요.</p></div>

<div class="step"><span class="step-badge">STEP 7</span><span class="step-title">트렌드 상품 비교 후 가져오기</span></div>
<p>트렌드 상품 목록에서 상위 상품을 확인하고, 판매 가능성이 있는 상품을 저장합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-zendrop-use-07.webp" alt=""></figure>
<ul class="bullets"><li><b>상품명</b> — 어떤 상품인지 먼저 확인</li><li><b>가격</b> — 판매했을 때 적정 마진이 남는지</li><li><b>주문 수</b> — 실제 반응이 있는 상품인지</li><li><b>평점</b> — 상품 만족도·신뢰도</li><li><b>배송 시간</b> — 고객이 기다릴 수 있는 기간인지</li><li><b>상품 가져오기</b> — 조건이 괜찮다고 판단되면 저장</li></ul>
<div class="callout note"><div class="callout-label">※ 참고</div><p>상위 상품이라고 무조건 좋은 것은 아닙니다. <b>너무 무겁거나 깨지기 쉬운 상품</b>은 신중하게 확인하세요.</p></div>

<div class="step"><span class="step-badge">STEP 8</span><span class="step-title">상품 요청 기능 사용하기</span></div>
<p>Zendrop 검색에서 원하는 상품이 나오지 않을 때는 <b>상품 요청</b> 기능을 사용합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-zendrop-use-08.webp" alt=""></figure>
<ul class="bullets"><li><b>상품 요청</b> — Zendrop에 없는 상품을 요청하는 메뉴</li><li><b>상품 링크</b> — 다른 쇼핑몰에서 복사한 상품 <b>상세페이지 URL</b> 붙여넣기</li><li><b>예상 하루 판매량</b> — 하루에 어느 정도 판매될 것 같은지 선택</li><li><b>요청하기</b> — 상품 요청 제출</li><li><b>상품 요청 내역</b> — 요청한 상품의 진행 상태 확인</li></ul>
<div class="callout note"><div class="callout-label">※ 참고</div><p>메인 페이지 주소가 아니라 <b>실제 상품 상세페이지 URL</b>을 넣는 것이 더 정확합니다.</p></div>

<div class="step"><span class="step-badge">STEP 9</span><span class="step-title">상품 요청 내역 확인하기</span></div>
<p>상품 요청 후에는 진행 상태와 견적 정보를 확인합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-zendrop-use-09.webp" alt=""></figure>
<ul class="bullets"><li><b>상품 요청 내역</b> — 요청한 상품의 진행 상황</li><li><b>상태</b> — 검토 중 / 소싱 중 / 완료 확인</li><li><b>견적</b> — 상품 가격 조건이 괜찮은지</li><li><b>배송업체</b> — 어떤 배송 방식으로 진행되는지</li></ul>
<div class="callout note"><div class="callout-label">※ 참고</div><p>요청 직후에는 내역이 비어 있을 수 있습니다. 업데이트되면 상태·견적·배송업체를 확인하면 됩니다.</p></div>

<div class="step"><span class="step-badge">STEP 10</span><span class="step-title">내 상품에서 내용 수정하기</span></div>
<p>저장한 상품은 Shopify로 보내기 전에 반드시 수정해야 합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-zendrop-use-10.webp" alt=""></figure>
<ul class="bullets"><li><b>내 상품</b> — 저장한 상품 목록 확인</li><li><b>수정할 상품 선택</b> — 클릭해 편집 화면으로 이동</li><li><b>상품 제목 수정</b> — 고객이 이해하기 쉬운 상품명으로 변경</li><li><b>상품 설명 수정</b> — 특징·사용 용도·장점 정리</li><li><b>저장 버튼</b> — 수정 내용을 반영하려면 반드시 클릭</li></ul>
<div class="callout note"><div class="callout-label">※ 참고</div><p>상품 제목은 <b>짧고 명확하게</b>, 설명은 고객이 읽기 쉽게 정리합니다. 브랜드명·캐릭터명·유명 상표명처럼 <b>저작권 문제가 될 수 있는 문구는 삭제하거나 수정</b>하세요. 수정 후에는 반드시 <b>저장</b>을 눌러야 반영됩니다.</p></div>

<div class="step"><span class="step-badge">STEP 11</span><span class="step-title">가격 · 재고 · 옵션 설정하기</span></div>
<p>상품을 Shopify로 보내기 전 가격·재고·옵션 정보를 확인합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-zendrop-use-11.webp" alt=""></figure>
<ul class="bullets"><li><b>판매가</b> — 고객이 실제로 결제하는 금액</li><li><b>비교가</b> — 할인 전 가격처럼 보이게 설정하는 항목</li><li><b>재고 수량</b> — 실제 판매 가능한 수량</li><li><b>옵션</b> — 색상·사이즈 등 선택지가 있는 상품일 때 확인</li><li><b>저장하기</b> — 가격·옵션 수정 후 저장</li><li><b>Shopify로 보내기</b> — 최종 수정한 상품을 Shopify로 업로드</li></ul>
<div class="callout note"><div class="callout-label">※ 주의</div><p>판매가는 <b>원가 + 배송비 + 광고비 + 수수료</b>를 고려해 설정합니다. 옵션이나 재고가 잘못되면 주문 후 고객 문의·취소가 생길 수 있으니 꼭 확인하세요.</p></div>

<div class="step"><span class="step-badge">STEP 12</span><span class="step-title">Shopify에서 상품 등록 확인하기</span></div>
<p>Zendrop에서 보낸 상품이 Shopify에 정상 등록되었는지 확인합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/source-zendrop-use-12.webp" alt=""></figure>
<ul class="bullets"><li><b>상품 메뉴</b> — Shopify 관리자에서 업로드된 상품 확인</li><li><b>업로드된 상품</b> — Zendrop에서 보낸 상품이 목록에 있는지</li><li><b>상태 확인</b> — 상품 상태가 <b>활성</b>인지</li><li><b>재고 확인</b> — 재고가 있는 상태인지</li><li><b>판매 채널 확인</b> — <b>온라인 스토어</b>에 연결되어 있는지</li></ul>
<div class="callout note"><div class="callout-label">※ 주의</div><p>상품이 Shopify에 등록되어 있어도 <b>비활성</b> 상태이면 고객이 볼 수 없습니다. 상태가 <b>활성</b>이고 판매 채널이 <b>온라인 스토어</b>에 연결되어 있어야 업로드가 완료된 것입니다.</p></div>

<h3 class="subhead">Zendrop 최종 체크리스트</h3>
<p>Shopify로 보내기 전 마지막으로 아래 내용을 확인합니다.</p>
<ul class="bullets"><li>상품명이 너무 길지 않은지</li><li>상품 설명이 고객이 이해하기 쉽게 작성되었는지</li><li>상품 이미지가 선명한지</li><li>저작권 문제가 될 수 있는 로고·브랜드명이 없는지</li><li>판매가가 적절한지 / 비교가가 필요한 경우 올바르게 설정되었는지</li><li>재고 수량이 입력되어 있는지</li><li>색상·사이즈 옵션이 정확한지</li><li>배송 기간이 너무 길지 않은지</li><li>저장 후 <b>Shopify로 보내기</b>를 눌렀는지</li><li>Shopify 관리자에서 상품 상태가 <b>활성</b>인지</li></ul>

<div class="callout overview"><div class="callout-label">✅ 핵심 정리</div><p>Zendrop은 <b>찾기 → 저장 → 수정 → 저장 → Shopify로 보내기 → Shopify에서 확인</b> 순서로 진행합니다. 이 순서만 기억하면 됩니다.</p></div>
$body$ where slug = 'sourcing';
