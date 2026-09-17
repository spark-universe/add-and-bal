-- ============================================================
-- 챕터 7 '컬렉션 설정'(slug=collection) 본문 교체
--  · 소메뉴 2개(순서): 컬렉션 생성(15스텝) → 컬렉션 구현(10스텝)  (data-subnav)
--  · 출처: notion/컬렉션_생성, notion/컬렉션_구현하기
--  Supabase SQL Editor 에서 실행. (이미지는 배포로 함께: manual/images/collection-create-*, collection-apply-*)
-- ============================================================
update public.manual_chapters set body = $body$<h3 class="subhead">컬렉션 설정</h3>
<div class="callout overview"><div class="callout-label">이 챕터 개요</div><p><b>컬렉션</b>은 상품을 주제별로 묶어 놓은 그룹입니다(예: Vitamin, Probiotics). 이 챕터에서는 먼저 <b>조건에 맞는 상품이 자동으로 모이는 컬렉션을 생성</b>하고, 이어서 만든 컬렉션을 <b>스토어 메인 화면에 '추천 컬렉션'으로 구현</b>하는 순서로 진행합니다.</p></div>


<h3 class="subsection" id="collection-create" data-subnav="컬렉션 생성">컬렉션 생성 (자동)</h3>
<div class="callout note"><div class="callout-label">💡 전체 흐름</div><p>제품 → 컬렉션 → <b>컬렉션 생성</b> → 제목·설명 입력 → <b>조건 추가</b>(어떤 상품을 모을지) → 저장 → 컬렉션 이미지 등록 → 최종 저장. 조건만 잘 걸어두면 이후 올리는 상품도 자동으로 들어옵니다.</p></div>

<div class="step"><span class="step-badge">STEP 1</span><span class="step-title">제품 메뉴 클릭</span></div>
<p>쇼피파이에 접속한 뒤 왼쪽 메뉴의 <b>제품</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/collection-create-01.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 2</span><span class="step-title">컬렉션 클릭</span></div>
<p>제품 아래의 <b>컬렉션</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/collection-create-02.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 3</span><span class="step-title">컬렉션 생성 클릭</span></div>
<p>오른쪽 위 <b>컬렉션 생성</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/collection-create-03.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 4</span><span class="step-title">제목 · 설명 입력</span></div>
<p><b>제목</b>과 <b>설명</b> 칸을 클릭해 내용을 입력합니다.</p>
<ul class="bullets"><li><b>제목</b> — 컬렉션 이름 (예: 건강기능식품 샵 → <code>Vitamin</code>, <code>Probiotics</code> 등)</li><li><b>설명</b> — 컬렉션 설명 (예: <code>This is Vitamin Products.</code> / <code>Here are probiotic products.</code> 등)</li></ul>
<div class="callout note"><div class="callout-label">‼ 팁</div><p>위 예시 외에도 <b>이 컬렉션이 어떤 상품 모음인지</b>를 설명하는 문장을 넣어 두면 좋습니다.</p></div>
<figure class="shot"><img loading="lazy" src="manual/images/collection-create-04.webp" alt=""></figure>
<p>(참고) 본 매뉴얼은 아래와 같이 작성했습니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/collection-create-05.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 5</span><span class="step-title">조건 추가 → 기준 선택</span></div>
<p><b>조건 추가</b>를 클릭한 뒤, 아래에 뜨는 목록에서 <b>어떤 기준으로 상품을 불러올지</b> 정합니다.</p>
<ul class="bullets"><li>예를 들어 <b>제목</b>을 기준으로 하면, 상품명에 <code>Probiotics</code>가 들어간 상품을 모두 가져온다고 보면 됩니다.</li></ul>
<figure class="shot"><img loading="lazy" src="manual/images/collection-create-06.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 6</span><span class="step-title">값 입력</span></div>
<p><b>값 추가</b>라고 된 칸에 불러오고자 하는 내용을 입력합니다.</p>
<div class="callout note"><div class="callout-label">※ 참고</div><p>본 매뉴얼은 <b>제목</b>을 기준으로 진행했습니다.</p></div>
<figure class="shot"><img loading="lazy" src="manual/images/collection-create-07.webp" alt=""></figure>
<p>(참고) 본 매뉴얼은 아래와 같이 진행했습니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/collection-create-08.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 7</span><span class="step-title">조건 범위 조정 (포함 · 같음 등)</span></div>
<p>가운데의 <b>포함</b>을 클릭하면 조건이 적용되는 범위를 바꿀 수 있습니다.</p>
<table class="mn-table"><thead><tr><th>선택</th><th>의미 (조건: Probiotics · 대상: 제목/상품명)</th></tr></thead><tbody>
<tr><td>같음</td><td>내용이 <b>100% 일치</b>하는 경우</td></tr>
<tr><td>같지 않음</td><td>내용이 <b>1%라도 다른</b> 경우</td></tr>
<tr><td>포함</td><td>조건(Probiotics)이 상품명 <b>안에 있는</b> 경우</td></tr>
<tr><td>포함하지 않음</td><td>조건(Probiotics)이 상품명에 <b>없는</b> 경우</td></tr>
<tr><td>다음으로 시작함</td><td>상품명이 조건(Probiotics)으로 <b>시작</b>하는 경우</td></tr>
<tr><td>다음으로 끝남</td><td>상품명이 조건(Probiotics)으로 <b>끝나는</b> 경우</td></tr>
</tbody></table>
<figure class="shot"><img loading="lazy" src="manual/images/collection-create-09.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 8</span><span class="step-title">(선택) 조건 더 추가하기</span></div>
<p>조건을 더 넣고 싶다면 <b>+</b> 버튼을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/collection-create-10.webp" alt=""></figure>
<p>추가된 줄에도 같은 방식으로 원하는 조건을 입력하면 됩니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/collection-create-11.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 9</span><span class="step-title">저장 → 조건에 맞는 상품 자동 유입</span></div>
<p><b>저장</b>을 누르면 조건에 일치하는 상품들이 컬렉션에 들어옵니다. (예시 화면)</p>
<div class="callout note"><div class="callout-label">※ 참고</div><p>상품이 추가되는 데 <b>일정 시간이 걸립니다.</b> 바로 안 보이면 <b>새로 고침</b> 후 확인하세요.</p></div>
<figure class="shot"><img loading="lazy" src="manual/images/collection-create-12.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 10</span><span class="step-title">컬렉션 이미지 영역 클릭</span></div>
<p>왼쪽 위의 <b>붉은 네모 박스</b>(이미지 자리)를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/collection-create-13.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 11</span><span class="step-title">파일 추가 클릭</span></div>
<p><b>파일 추가</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/collection-create-14.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 12</span><span class="step-title">이미지 파일 선택 → 열기</span></div>
<p>추가할 이미지 파일을 클릭한 뒤 <b>열기</b>를 클릭합니다.</p>
<div class="callout note"><div class="callout-label">※ 참고</div><p>컬렉션에 쓸 이미지 파일은 <b>"이미지 소싱" 자료</b>를 참고해 준비하세요.</p></div>
<figure class="shot"><img loading="lazy" src="manual/images/collection-create-15.webp" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/collection-create-16.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 13</span><span class="step-title">이미지 선택 → 완료</span></div>
<p>업로드가 끝나면 추가할 이미지를 선택하고 <b>완료</b>를 클릭합니다.</p>
<div class="callout note"><div class="callout-label">※ 참고</div><p>이미지를 추가하면 <b>자동으로 선택</b>됩니다. 별도로 클릭하지 않아도 됩니다.</p></div>
<figure class="shot"><img loading="lazy" src="manual/images/collection-create-17.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 14</span><span class="step-title">최종 저장</span></div>
<p>제목·설명·조건·이미지가 정상적으로 들어갔다면 오른쪽 위 <b>저장</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/collection-create-18.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 15</span><span class="step-title">추가된 컬렉션 확인</span></div>
<p>컬렉션 목록에서 방금 만든 컬렉션이 보이면 완료입니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/collection-create-19.webp" alt=""></figure>
<div class="callout overview"><div class="callout-label">✅ 여기까지</div><p>컬렉션이 만들어졌습니다. 이제 이 컬렉션을 스토어 화면에 보이도록 <b>구현</b>합니다. (아래 <b>컬렉션 구현</b>)</p></div>


<h3 class="subsection" id="collection-apply" data-subnav="컬렉션 구현">컬렉션 구현 (스토어 화면에 넣기)</h3>
<div class="callout note"><div class="callout-label">💡 전체 흐름</div><p>온라인 스토어 → <b>사용자 지정</b>(테마 편집) → <b>Add Section</b> → <b>추천 컬렉션</b> → 컬렉션 선택 → 제품 카드 <b>이미지 비율</b> 조정 → 저장.</p></div>

<div class="step"><span class="step-badge">STEP 1</span><span class="step-title">온라인 스토어 클릭</span></div>
<p>쇼피파이에 접속한 뒤 왼쪽 메뉴의 <b>온라인 스토어</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/collection-apply-01.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 2</span><span class="step-title">사용자 지정 클릭</span></div>
<p>테마 옆의 <b>사용자 지정</b>을 클릭해 테마 편집 화면으로 들어갑니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/collection-apply-02.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 3</span><span class="step-title">Add Section 클릭</span></div>
<p>왼쪽 섹션 목록 아래의 <b>Add Section</b>(섹션 추가)을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/collection-apply-03.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 4</span><span class="step-title">추천 컬렉션 클릭</span></div>
<p>목록에서 <b>추천 컬렉션</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/collection-apply-04.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 5</span><span class="step-title">컬렉션 → 선택 클릭</span></div>
<p>왼쪽 설정의 <b>컬렉션</b> 항목에서 <b>선택</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/collection-apply-05.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 6</span><span class="step-title">넣고 싶은 컬렉션 선택</span></div>
<p>앞에서 만든 컬렉션 중 화면에 넣고 싶은 것을 선택합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/collection-apply-06.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 7</span><span class="step-title">미리보기에서 아무 상품이나 클릭</span></div>
<p>오른쪽 미리보기의 <b>빨간 네모 박스 안</b>에서 아무 상품이나 클릭합니다. (제품 카드 설정이 열립니다.)</p>
<figure class="shot"><img loading="lazy" src="manual/images/collection-apply-07.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 8</span><span class="step-title">제품 카드 → 이미지 비율 클릭</span></div>
<p><b>제품 카드</b> → <b>이미지 비율</b>에서 <b>이미지에 맞춤</b>으로 되어 있는 부분을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/collection-apply-08.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 9</span><span class="step-title">세로형 또는 정사각형 선택</span></div>
<p><b>세로형</b> 또는 <b>정사각형</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/collection-apply-09.webp" alt=""></figure>
<p>(참고) <b>세로형</b>을 선택하면 다음과 같이 보입니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/collection-apply-10.webp" alt=""></figure>
<p>(참고) <b>정사각형</b>을 선택하면 다음과 같이 보입니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/collection-apply-11.webp" alt=""></figure>
<div class="callout note"><div class="callout-label">💡 권장</div><p>이미지 비율은 <b>정사각형 또는 세로형</b>으로 진행해 주세요. 상품 이미지 크기가 제각각이어도 카드가 고르게 정리됩니다.</p></div>

<div class="step"><span class="step-badge">STEP 10</span><span class="step-title">완료 · 저장</span></div>
<p>설정이 끝나면 오른쪽 위 <b>저장</b>을 클릭합니다. 완료되면 다음과 같이 메인 화면에 추천 컬렉션이 표시됩니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/collection-apply-12.webp" alt=""></figure>
<div class="callout overview"><div class="callout-label">✅ 마무리</div><p>컬렉션을 더 넣고 싶다면 <b>Add Section → 추천 컬렉션</b>을 반복하고, 각 섹션에서 다른 컬렉션을 선택하면 됩니다.</p></div>
$body$ where slug = 'collection';
