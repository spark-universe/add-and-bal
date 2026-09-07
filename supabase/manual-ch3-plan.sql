-- ============================================================
-- 챕터 3 '스토어 구상'(slug=plan) 본문 교체
--  · 레퍼런스 조사 3가지: 방법1(Shop 벤치마킹)/방법2(성공 스토어)/방법3(구글 트렌드)
--  · 각 방법 data-subnav 앵커 → 사이드바 소메뉴
--  · 워크시트 내려받기(자사 DOCX) + 직접 그려도 된다는 안내
--  Supabase SQL Editor 에서 실행. (이미지/워크시트는 배포로 함께: manual/images/plan-*, manual/files/store-plan.docx)
-- ============================================================
update public.manual_chapters set body = $body$<h3 class="subhead">스토어 구상 — 레퍼런스 조사</h3>
<div class="callout overview"><div class="callout-label">이 챕터 개요</div><p>내 스토어를 만들기 전에, 잘 만들어진 다른 스토어와 트렌드를 먼저 조사합니다. 아래 <b>3가지 방법</b>으로 레퍼런스를 모은 뒤 내 스토어 구상을 정리하세요.</p><p>정리는 아래 <b>워크시트를 내려받아 작성</b>해도 되고, 형식에 얽매이지 않고 <b>직접 자유롭게 그려서</b> 구상해도 좋습니다.</p></div>

<a class="mn-download" href="manual/files/store-plan.docx" download="Shopify 샵 구상.docx">📄 스토어 구상 워크시트 내려받기</a>


<h3 class="subsection" id="plan-m1" data-subnav="방법1 · Shop 벤치마킹">방법 1. Shop에서 벤치마킹</h3>
<div class="callout note"><div class="callout-label">💡 참고</div><p>Shop에서 사이트를 찾는 방법입니다. 아마존·알리·쿠팡·네이버 등 다른 사이트를 봐도 됩니다. 다만 <b>Shop에 등록된 사이트는 대부분 Shopify로 제작</b>되어 있어 예시로 사용했습니다.</p></div>

<div class="step"><span class="step-badge">STEP 1</span><span class="step-title">"Shop" 검색</span></div>
<p>구글에 <b>Shop</b>을 검색합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/plan-m1-01.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 2</span><span class="step-title">검색창 클릭</span></div>
<p>Shop에 접속한 뒤 검색창을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/plan-m1-02.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 3</span><span class="step-title">관심 키워드 입력</span></div>
<p>관심 있는 검색어를 입력합니다. (본 매뉴얼은 <b>vitamin</b>으로 검색했습니다.)</p>
<figure class="shot"><img loading="lazy" src="manual/images/plan-m1-03.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 4</span><span class="step-title">배송 국가 확인</span></div>
<p>검색 후 <b>Ships to - KR</b>로 되어 있으면 그 부분을 클릭합니다. (이미 <b>Ships to - US</b>라면 STEP 8부터 진행하세요.)</p>
<figure class="shot"><img loading="lazy" src="manual/images/plan-m1-04.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 5</span><span class="step-title">Select a country</span></div>
<p><b>Select a country</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/plan-m1-05.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 6</span><span class="step-title">United States 선택</span></div>
<p><b>United States</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/plan-m1-06.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 7</span><span class="step-title">Done</span></div>
<p><b>United States</b>로 설정된 것을 확인하고 <b>Done</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/plan-m1-07.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 8</span><span class="step-title">벤치마킹할 제품 선택</span></div>
<p>벤치마킹하고 싶은 제품을 클릭합니다. (본 매뉴얼은 <b>Vitamin B12 Plus</b>로 진행했습니다.)</p>
<figure class="shot"><img loading="lazy" src="manual/images/plan-m1-08.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 9</span><span class="step-title">More details 클릭</span></div>
<p>상품 창에서 <b>More details at ○○</b> 부분을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/plan-m1-09.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 10</span><span class="step-title">메인으로 이동</span></div>
<p>사이트 접속 후 <b>메인 로고 · Shop · Home</b> 중 하나를 눌러 메인 페이지로 이동합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/plan-m1-10.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 11</span><span class="step-title">디자인·구성 파악</span></div>
<p>사이트의 디자인 요소와 구성을 파악하며 벤치마킹을 진행합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/plan-m1-11.png" alt=""></figure>


<h3 class="subsection" id="plan-m2" data-subnav="방법2 · 베스트 스토어">방법 2. 성공 스토어(Best Store) 보기</h3>
<div class="callout note"><div class="callout-label">💡 참고</div><p>Shopify 공식 성공 사례에서 카테고리별 우수 스토어를 볼 수 있습니다. 접속 주소: <b>shopify.com/kr/case-studies</b></p></div>

<div class="step"><span class="step-badge">STEP 1</span><span class="step-title">성공 사례 접속 · 마켓</span></div>
<p>위 주소로 접속한 뒤, 화면의 <b>마켓</b> 부분(빨간 네모)을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/plan-m2-01.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 2</span><span class="step-title">관심 카테고리 선택</span></div>
<p>빨간 네모 표시 중 <b>관심 있는 카테고리</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/plan-m2-02.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 3</span><span class="step-title">스토어 선택</span></div>
<p>이후 나오는 목록에서 <b>보고 싶은 스토어</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/plan-m2-03.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 4</span><span class="step-title">아래로 스크롤</span></div>
<p>페이지를 <b>아래로 스크롤</b>합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/plan-m2-04.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 5</span><span class="step-title">스토어 링크 찾기</span></div>
<p>빨간 네모처럼 <b>링크로 된 부분</b>을 찾아 클릭합니다. (글마다 위치가 다르고, 일부는 링크가 없을 수 있어요.)</p>
<figure class="shot"><img loading="lazy" src="manual/images/plan-m2-05.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 6</span><span class="step-title">벤치마킹 진행</span></div>
<p>접속되는 사이트를 보며 벤치마킹을 진행합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/plan-m2-06.png" alt=""></figure>


<h3 class="subsection" id="plan-m3" data-subnav="방법3 · 트렌드 분석">방법 3. 구글 트렌드로 분석</h3>
<div class="callout note"><div class="callout-label">💡 참고</div><p>구글 트렌드로 미국의 인기 검색·트렌드를 확인합니다. 접속 주소: <b>trends.google.com/trends</b></p></div>

<div class="step"><span class="step-badge">STEP 1</span><span class="step-title">구글 트렌드 접속</span></div>
<p>주소창에 <b>trends.google.com/trends</b>를 입력해 접속합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/plan-m3-01.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 2</span><span class="step-title">실시간 인기 열기</span></div>
<p>스크롤을 내려 <b>현재 위치의 실시간 인기</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/plan-m3-02.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 3</span><span class="step-title">지역 변경 열기</span></div>
<p><b>대한민국</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/plan-m3-03.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 4</span><span class="step-title">미국 검색</span></div>
<p>위치 검색란에 <b>미국</b> 또는 <b>United States</b>를 입력합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/plan-m3-04.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 5</span><span class="step-title">미국 선택</span></div>
<p><b>미국</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/plan-m3-05.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 6</span><span class="step-title">모든 지역</span></div>
<p><b>모든 지역</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/plan-m3-06.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 7</span><span class="step-title">카테고리 열기</span></div>
<p>미국으로 변경된 것을 확인하고 <b>모든 카테고리</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/plan-m3-07.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 8</span><span class="step-title">분석 카테고리 선택</span></div>
<p>트렌드를 분석할 카테고리를 클릭합니다. (본 매뉴얼은 <b>쇼핑</b>으로 진행했습니다.)</p>
<figure class="shot"><img loading="lazy" src="manual/images/plan-m3-08.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 9</span><span class="step-title">시간대 열기</span></div>
<p>설정한 카테고리를 확인하고 <b>시간대</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/plan-m3-09.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 10</span><span class="step-title">시간 범위 선택</span></div>
<p>검색할 시간 범위를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/plan-m3-10.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 11</span><span class="step-title">리스트 확인</span></div>
<p>나오는 리스트들을 확인합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/plan-m3-11.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 12</span><span class="step-title">트렌드 분석</span></div>
<p>원하는 내용을 클릭해 트렌드를 분석합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/plan-m3-12.png" alt=""></figure>


<div class="callout overview"><div class="callout-label">✅ 마무리</div><p>세 가지 방법으로 조사한 내용을 바탕으로, 위의 <b>스토어 구상 워크시트</b>를 내려받아 내 스토어의 컨셉·상품·디자인 방향을 정리해 주세요.</p></div>
$body$ where slug = 'plan';
