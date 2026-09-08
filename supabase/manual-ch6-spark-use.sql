-- ============================================================
-- 챕터 6 (slug=upload) 제목 '스파크 사용법' + 본문 교체
--  · 소메뉴 2개: 기능 정리 / 이용 방법 (data-subnav)
--  Supabase SQL Editor 에서 실행. (이미지: manual/images/spark-func-*, spark-how-*)
-- ============================================================
update public.manual_chapters set title = '스파크 사용법', body = $body$<h3 class="subhead">스파크 사용법</h3>
<div class="callout overview"><div class="callout-label">이 챕터 개요</div><p>스파크의 <b>기능</b>을 먼저 훑어본 뒤(기능 정리), 실제로 아마존에서 상품을 <b>소싱하는 방법</b>(이용 방법)을 따라 합니다. 설치·연동이 안 돼 있으면 먼저 <b>스파크 기본 설정</b> 챕터를 진행해 주세요.</p></div>

<h3 class="subsection" id="spark-func" data-subnav="기능 정리">스파크 기능 정리</h3>
<div class="callout note"><div class="callout-label">💡 참고</div><p>버전에 따라 화면이 달라 보여도 진행 방식은 같습니다. 아래는 각 메뉴가 어떤 기능인지 정리한 내용입니다.</p></div>

<h3 class="subhead">1. 메뉴 보기</h3>
<p>좌측 상단의 <b>네모 4개 아이콘</b>을 클릭하면 메뉴가 열리고, 각 메뉴명을 확인할 수 있습니다. (이후 설명은 대부분 이 메뉴명으로 진행됩니다.)</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-01.png" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-02.png" alt=""></figure>

<h3 class="subhead">2. 작업 설정 — 검색 결과 · 상품 상세</h3>
<p><b>수집 링크 추가</b>를 누른 뒤, 소싱 방식을 고릅니다.</p>
<ul class="bullets"><li><b>검색 결과</b> — 수량이 많은 <b>대량 상품</b>을 소싱할 때</li><li><b>상품 상세</b> — 단 <b>하나의 상품 상세페이지</b>를 소싱할 때</li></ul>
<p>정확한 링크 형식은 스파크의 <b>예시 링크</b>를 눌러 확인할 수 있습니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-03.png" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-04.png" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-05.png" alt=""></figure>

<h3 class="subhead">3. 윈도우 보기 (신기능)</h3>
<p>소싱 중인 상품 페이지들을 <b>실시간으로 보여주는</b> 기능입니다. 링크를 넣고 <b>윈도우보기</b> → <b>작업 시작</b>을 누르면, 소싱하는 창이 실제로 뜹니다. (왼쪽: 전체 탐색 / 오른쪽: 소싱 중 화면)</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-06.png" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-07.png" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-08.png" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-09.png" alt=""></figure>
<div class="callout note"><div class="callout-label">💡 로딩 안내</div><p>강아지 사진이 뜨는 페이지는 <b>일시적 로딩중</b>일 수 있어요. 스파크가 자동으로 약 3회 재접속하니 그대로 두면 됩니다. 계속 안 되면 다른 링크로 시도하거나 다시 소싱하세요.</p></div>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-10.png" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-11.png" alt=""></figure>

<h3 class="subhead">4. Prime 기능 (신기능)</h3>
<p>아마존에서 <b>프라임 제품만</b> 소싱하는 기능입니다. 링크를 넣고 <b>Prime</b> → 작업 시작을 누릅니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-12.png" alt=""></figure>
<div class="callout note"><div class="callout-label">⚠ 주의</div><p>아마존 좌측 <b>필터</b>를 함께 쓰면 소싱이 안 됩니다. 아직 불안정한 기능이라 정상 링크여도 안 될 수 있어, <b>사용을 권장하지 않습니다</b>.</p></div>

<h3 class="subhead">5. 모니터링 &amp; 로그</h3>
<p>소싱이 <b>실시간으로 어떻게 진행되는지</b> 확인하는 기능입니다. 링크를 넣고 <b>작업 시작</b>을 누르면 로그와 모니터링에 진행 상황이 표시됩니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-13.png" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-14.png" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-15.png" alt=""></figure>
<ul class="bullets"><li><b>로그</b> — 작업 시작 · 페이지 소싱 · 상품 수집 완료[상품코드] · 수집 실패(약물성·재고없음 등) 를 실시간 표시</li><li><b>모니터링</b> — 수집 <b>완료된 상품</b>만 모아서 표시</li></ul>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-16.png" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-17.png" alt=""></figure>

<h3 class="subhead">6. 데이터 관리 — 최근 작업 데이터 불러오기</h3>
<p>가장 최근에 완료된 소싱 데이터를 바로 불러오는 기능입니다. <b>최근 작업 데이터 불러오기</b>를 누르면 최근 소싱 내용이 로그·모니터링에 표시됩니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-18.png" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-19.png" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-20.png" alt=""></figure>

<h3 class="subhead">7. 데이터 관리 — 데이터 불러오기</h3>
<p>지금까지 소싱한 파일 중 <b>원하는 파일을 골라</b> 불러옵니다. <b>데이터 불러오기</b> → 파일 선택 → <b>폴더 선택</b> → 정상 로드 확인 순서입니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-21.png" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-22.png" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-23.png" alt=""></figure>
<div class="callout note"><div class="callout-label">💡 파일명 규칙</div><p>파일명은 <b>MMDD_HHMMSS(월일_시분초)</b> — 소싱을 시작한 시간으로 자동 지정됩니다. (예: 3/25 19:35:52 시작 → <code>0325_193552</code>) 필요하면 파일명을 바꿔도 됩니다.</p></div>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-24.png" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-25.png" alt=""></figure>

<h3 class="subhead">8. 데이터 관리 — 위치</h3>
<p>수집한 상품을 스토어에 올릴 때 <b>업로드 위치</b>를 지정하는 기능입니다. 데이터 불러오기에서 <b>위치: @@@</b> 부분을 눌러 위치를 선택합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-26.png" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-27.png" alt=""></figure>
<div class="callout note"><div class="callout-label">⚠ 주의</div><p>업로드는 <b>미국 주소지</b>로 된 위치에서 진행해 주세요. (쇼피파이 → 설정 → 위치에서 확인)</p></div>

<h3 class="subhead">9. 데이터 관리 — 업로드</h3>
<p>수집이 끝난 상품을 스토어로 올리는 기능입니다. 데이터를 불러온 뒤 <b>업로드</b> → <b>확인</b>을 누르면 업로드가 시작됩니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-28.png" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-29.png" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-30.png" alt=""></figure>
<p>업로드 버튼이 <b>로딩 → 업로드 가능</b>으로 바뀌면 완료입니다. (안내 메시지는 자동으로 사라집니다.) 아래는 업로드 전/후 비교입니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-31.png" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-32.png" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-33.png" alt=""></figure>

<h3 class="subhead">10. 설정 메뉴</h3>
<p>스파크와 Shopify를 연결하는 설정 화면입니다.</p>
<ul class="bullets"><li><b>스토어 이름</b> — 스토어 URL(끝의 <code>.myshopify.com</code>은 빼고 입력, 자동으로 붙음)</li><li><b>스토어 AccessToken</b> — 쇼피파이와 스파크를 잇는 값 (발행은 <b>스파크 기본 설정</b> 참고)</li><li><b>상품 마진</b> — % 단위로 마진율 설정</li></ul>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-34.png" alt=""></figure>
<p>계정 설정에서는 <b>이름</b>(가입 시 이름)과 <b>아이디</b>(로그인 중인 스파크 ID)를 확인할 수 있습니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-func-35.png" alt=""></figure>


<h3 class="subsection" id="spark-how" data-subnav="이용 방법">상품 소싱 (아마존 → 스파크)</h3>
<div class="callout note"><div class="callout-label">💡 참고</div><p>아마존 기본 설정이 안 돼 있다면 먼저 진행해 주세요. 아래는 아마존에서 카테고리를 찾아 링크를 복사한 뒤, 스파크로 대량 소싱하는 과정입니다.</p></div>

<div class="step"><span class="step-badge">STEP 1</span><span class="step-title">아마존 · All</span></div>
<p>아마존에 접속해 <b>All</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-how-01.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 2</span><span class="step-title">See all</span></div>
<p><b>Shop by Department</b>에서 <b>See all</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-how-02.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 3</span><span class="step-title">카테고리 선택</span></div>
<p>소싱하고 싶은 <b>카테고리</b>를 선택합니다. (본 매뉴얼은 건강기능식품 기준으로 진행했습니다.)</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-how-03.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 4</span><span class="step-title">상세 카테고리 선택</span></div>
<p>이어서 <b>상세 카테고리</b>를 선택합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-how-04.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 5</span><span class="step-title">상품군 선택</span></div>
<p>원하는 <b>상품군</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-how-05.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 6</span><span class="step-title">See ~ Products</span></div>
<p>우측 상단 <b>See ~~~ Products &gt;</b> 부분을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-how-06.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 7</span><span class="step-title">링크 복사 · 개수 확인</span></div>
<p>해당 페이지의 <b>사이트 링크를 복사</b>하고, 상품 <b>총 개수</b>를 확인합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-how-07.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 8</span><span class="step-title">수집 링크 추가</span></div>
<p>스파크에서 <b>수집 링크 추가</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-how-08.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 9</span><span class="step-title">링크 붙여넣기</span></div>
<p><b>수집 링크</b> 칸에 STEP 7에서 복사한 링크를 붙여넣습니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-how-09.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 10</span><span class="step-title">추가</span></div>
<p><b>추가</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-how-10.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 11</span><span class="step-title">작업 시작</span></div>
<p><b>작업 시작</b>을 클릭합니다. (윈도우 보기·Prime은 자유롭게 — 자세한 건 기능 정리 참고)</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-how-11.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 12</span><span class="step-title">진행 준비중</span></div>
<p>작업 시작 옆이 <b>돌아가는 중</b>이면 진행을 준비하는 상태입니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-how-12.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 13</span><span class="step-title">정상 시작 확인</span></div>
<p>버튼이 <b>작업 중지</b>로 바뀌면 정상적으로 시작된 것입니다. (좌측 상단 <b>진행중</b> 표시, 또는 로그로 확인)</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-how-13.png" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/spark-how-14.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 14</span><span class="step-title">진행 중 화면</span></div>
<p>작업이 진행되는 화면입니다. (왼쪽: 로그 / 오른쪽: 모니터링)</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-how-15.png" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/spark-how-16.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 15</span><span class="step-title">구매 불가 상품</span></div>
<p>소싱 중 <b>구매 불가 상품</b>이 있을 수 있습니다. 쇼피파이에서 판매 불가하거나 판매하면 안 되는 제품(약물·규정 위반·재고 없음 등)으로, 자동으로 소싱되지 않습니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-how-17.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 16</span><span class="step-title">소싱 완료</span></div>
<p>소싱이 끝나면 아래와 같이 표시됩니다. (정상 완료 시 자동 종료되며 별도 종료 메시지는 없습니다.)</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-how-18.png" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/spark-how-19.png" alt=""></figure>
<div class="callout note"><div class="callout-label">💡 참고</div><p>아마존에 표시된 숫자와 실제 소싱 개수는 다를 수 있어요. 그럴 땐 링크를 추가로 더 소싱하면 됩니다. (예: 약 6시간 가동 → 약 900개 수집. <b>수집 속도는 PC 성능·네트워크에 따라 크게 달라집니다.</b>)</p></div>
$body$ where slug = 'upload';
