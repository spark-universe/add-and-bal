-- ============================================================
-- 챕터 8 '파비콘 · 로고'(slug=favicon) 본문 교체
--  · 소메뉴 2개(순서): 만들기(11스텝, 생성형 AI 프롬프트 3개) → 설정하기(15스텝, Shopify 테마 적용)
--  · 프롬프트는 .mn-prompt 블록 + [복사] 버튼 (manual.css / manual.html 본문 클릭 핸들러)
--  · 출처: notion/로고&파비콘/로코&파비콘 만들기, 로고&파비콘 적용하기
--  Supabase SQL Editor 에서 실행. (이미지는 배포로 함께: manual/images/favicon-make-*, favicon-apply-*)
-- ============================================================
update public.manual_chapters set body = $body$<h3 class="subhead">로고 &amp; 파비콘</h3>
<div class="callout overview"><div class="callout-label">이 챕터 개요</div><p><b>로고</b>는 스토어 상단(헤더)에 보이는 브랜드 표시이고, <b>파비콘</b>은 브라우저 탭에 뜨는 작은 아이콘입니다. 이 챕터는 먼저 <b>생성형 AI로 로고와 파비콘을 만들고</b>, 이어서 만든 파일을 <b>Shopify 테마에 설정</b>하는 순서로 진행합니다.</p></div>


<h3 class="subsection" id="favicon-make" data-subnav="만들기">로고 &amp; 파비콘 만들기</h3>
<div class="callout note"><div class="callout-label">💡 시작 전에</div><p>생성형 AI는 <b>자유롭게</b> 쓰셔도 됩니다 (ChatGPT · Gemini · Claude 등). 본 매뉴얼은 <b>ChatGPT</b>를 기준으로 진행했습니다. 아래 프롬프트는 <b>[복사]</b> 버튼으로 그대로 복사한 뒤 <b>노란색으로 칠해진 부분만</b> 내 스토어 정보로 바꿔 쓰면 됩니다. <b>[스토어 정보]</b>·<b>[제작 기준]</b> 같은 제목 줄은 그대로 두세요.</p></div>

<div class="step"><span class="step-badge">STEP 1</span><span class="step-title">생성형 AI 접속</span></div>
<p>사용할 생성형 AI에 접속합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/favicon-make-01.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 2</span><span class="step-title">(선택) 스토어 이름 정하기</span></div>
<p>아직 스토어 이름을 정하지 않았다면 아래 프롬프트로 먼저 정합니다. <b>노란색 부분</b>을 내 정보로 바꿔 주세요.</p>
<div class="mn-prompt"><div class="mn-prompt__head"><span>📋 프롬프트 ① 브랜드 이름 추천 — 노란색 부분만 바꿔서 사용</span><button type="button" class="mn-copy">복사</button></div><pre>내 Shopify 스토어에서 사용할 브랜드 이름을 추천해줘.

[스토어 정보]
- 주요 판매 카테고리: <mark class="fill">[예: 반려동물 용품 / 캠핑용품 / 건강기능식품]</mark>
- 주요 고객층: <mark class="fill">[예: 미국의 30~50대 여성]</mark>
- 판매 국가: <mark class="fill">[예: 미국]</mark>
- 원하는 브랜드 이미지: <mark class="fill">[예: 신뢰감 있고 세련된 프리미엄 브랜드]</mark>
- 원하는 느낌 또는 키워드: <mark class="fill">[예: 자연, 건강, 활력 / 없으면 생략]</mark>

[브랜드 이름 제작 기준]
1. 실제 온라인 쇼핑몰 브랜드로 사용하기 좋은 이름을 추천해줘.
2. 영어권 고객이 읽고 발음하기 쉬운 이름으로 만들어줘.
3. 너무 길지 않고 기억하기 쉬운 이름을 우선해줘.
4. 특정 상품 하나에만 한정되는 이름은 피하고, 향후 다른 상품으로 확장하기 좋은 이름으로 만들어줘.
5. 일반적인 단어를 단순 조합한 이름보다는 브랜드 고유성이 느껴지는 이름을 우선해줘.
6. 철자가 지나치게 어렵거나 의미를 이해하기 어려운 이름은 피해야 해.
7. 유명 브랜드와 혼동될 가능성이 높은 이름은 제외해줘.
8. 이미 있는 브랜드라면 제외해줘.
9. 총 10개의 이름을 추천해줘.
10. 로고와 파비콘까지 제작할 것이기에 해당 부분을 유의해줘.

각 이름은 아래 형식으로 정리해줘.

- 브랜드명:
- 발음:
- 이름의 의미 및 선정 이유:
- 브랜드에서 느껴지는 이미지:

마지막에는 10개 중 서로 다른 방향성을 가진 후보 3개를 추려서 각각 어떤 브랜드 콘셉트에 어울리는지 설명해줘.

※ 실제 사용 가능 여부는 확정하지 말고, 최종 선정 전 도메인 및 상표 등록 여부를 별도로 확인해야 한다고 안내해줘.</pre></div>
<p>(참고) 아래는 참고용 화면입니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/favicon-make-02.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 3</span><span class="step-title">브랜드명 확보</span></div>
<p>AI의 답변을 바탕으로 원하는 브랜드명을 고릅니다. 마음에 드는 게 없다면 추가로 요청해서 다시 받으세요.</p>
<div class="callout note"><div class="callout-label">※ 참고</div><p>본 매뉴얼은 답변 중 4번 <b>"Walistry"</b>를 기준으로 진행했습니다.</p></div>
<figure class="shot"><img loading="lazy" src="manual/images/favicon-make-03.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 4</span><span class="step-title">로고 제작 프롬프트 입력</span></div>
<p>브랜드명을 정했다면 아래 프롬프트로 로고를 만듭니다. <b>노란색 부분</b>을 내 정보로 바꿔 주세요.</p>
<div class="mn-prompt"><div class="mn-prompt__head"><span>📋 프롬프트 ② 로고 제작 — 노란색 부분만 바꿔서 사용</span><button type="button" class="mn-copy">복사</button></div><pre>내 Shopify 스토어에서 사용할 전문적인 브랜드 로고를 제작해줘.

[브랜드 정보]
- 스토어명: <mark class="fill">[스토어 이름]</mark>
- 주요 판매 카테고리: <mark class="fill">[예: 반려동물 용품 / 캠핑용품 / 건강기능식품]</mark>
- 주요 고객층: <mark class="fill">[예: 미국의 30~50대 여성]</mark>
- 원하는 브랜드 이미지: <mark class="fill">[예: 신뢰감 있고 세련된 프리미엄 브랜드]</mark>
- 선호 색상: <mark class="fill">[예: 네이비, 화이트]</mark>
- 피하고 싶은 색상 또는 스타일: <mark class="fill">[없으면 생략]</mark>

[로고 제작 기준]
1. Shopify 온라인 스토어의 헤더에 사용하기 적합한 가로형 로고로 제작해줘.
2. 스토어 이름이 명확하게 읽히도록 해줘.
3. 심볼 또는 아이콘과 브랜드명을 자연스럽게 조합해줘.
4. 작은 화면이나 모바일에서도 알아보기 쉬운 단순하고 깔끔한 디자인으로 만들어줘.
5. 지나치게 복잡한 그림, 세밀한 장식, 3D 효과는 사용하지 마.
6. 브랜드의 판매 카테고리를 너무 직접적으로 표현하기보다는 실제 브랜드처럼 세련되게 표현해줘.
7. 로고 주변에는 충분한 여백을 확보해줘.
8. 웹사이트에 바로 사용할 수 있는 완성된 브랜드 로고 형태로 제작해줘.</pre></div>
<figure class="shot"><img loading="lazy" src="manual/images/favicon-make-04.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 5</span><span class="step-title">로고 완성</span></div>
<p>로고가 나오면 완성입니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/favicon-make-05.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 6</span><span class="step-title">이미지 선택</span></div>
<p>이미지 <b>우측 하단 동그란 표시</b>를 클릭한 뒤 <b>"이 이미지"</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/favicon-make-06.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 7</span><span class="step-title">다운로드</span></div>
<p><b>다운로드</b>를 클릭해 로고 파일을 저장합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/favicon-make-07.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 8</span><span class="step-title">(선택) 마음에 들지 않으면 다시 생성</span></div>
<p>나온 로고가 마음에 들지 않으면 새로 생성합니다. 이때 <b>어떤 느낌을 원하는지 구체적으로</b> 전달하는 것이 중요합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/favicon-make-08.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 9</span><span class="step-title">마음에 드는 로고 저장</span></div>
<p>마음에 드는 로고가 나왔다면 STEP 6·7과 같은 방법으로 이미지를 저장합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/favicon-make-09.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 10</span><span class="step-title">파비콘 제작 프롬프트 입력</span></div>
<p>같은 대화에서 이어서 아래 프롬프트로 파비콘을 만듭니다. 파비콘은 <b>프롬프트를 수정하지 않고 그대로</b> 입력해도 됩니다.</p>
<div class="mn-prompt"><div class="mn-prompt__head"><span>📋 프롬프트 ③ 파비콘 제작 — 수정 없이 그대로 사용</span><button type="button" class="mn-copy">복사</button></div><pre>방금 완성한 Shopify 스토어 로고를 기준으로 동일한 브랜드 아이덴티티의 파비콘(Favicon)을 제작해줘.

[파비콘 제작 기준]
1. 최종 사용 크기는 32×32px이야.
2. 기존 로고의 색상과 디자인 스타일을 그대로 유지해줘.
3. 전체 브랜드명을 넣지 말고, 기존 로고에서 가장 대표적인 심볼 또는 브랜드 이니셜을 활용해줘.
4. 32×32px의 매우 작은 크기에서도 형태를 명확하게 알아볼 수 있도록 최대한 단순화해줘.
5. 작은 글자, 얇은 선, 복잡한 패턴, 세밀한 장식은 제거해줘.
6. 심볼이 화면 중앙에 위치하도록 하고 주변에 적절한 여백을 확보해줘.
7. 브라우저 탭에서 표시되었을 때 브랜드를 쉽게 구분할 수 있도록 높은 가독성을 유지해줘.
8. 새로운 로고를 만들지 말고, 반드시 앞서 제작한 로고의 브랜드 아이덴티티를 유지해줘.

최종 결과물은 32×32px 파비콘으로 사용할 수 있도록 정사각형 형태로 제작해줘.</pre></div>
<figure class="shot"><img loading="lazy" src="manual/images/favicon-make-10.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 11</span><span class="step-title">파비콘 완성</span></div>
<p>원하는 파비콘이 나오면 끝입니다. 수정을 원하면 추가로 요청해서 고치고, STEP 6·7과 같은 방법으로 저장하세요.</p>
<figure class="shot"><img loading="lazy" src="manual/images/favicon-make-11.webp" alt=""></figure>
<div class="callout overview"><div class="callout-label">✅ 여기까지</div><p>이제 <b>로고 파일</b>과 <b>파비콘 파일</b> 두 개가 준비됐습니다. 아래 <b>설정하기</b>에서 Shopify 테마에 넣습니다.</p></div>


<h3 class="subsection" id="favicon-apply" data-subnav="설정하기">로고 &amp; 파비콘 설정하기</h3>
<div class="callout note"><div class="callout-label">💡 전체 흐름</div><p>온라인 스토어 → <b>테마 편집하기</b> → 톱니바퀴(테마 설정) → <b>로고</b> 파일 업로드 → <b>파비콘</b> 파일 업로드 → 저장 → 스토어 보기로 브라우저 탭 확인.</p></div>

<div class="step"><span class="step-badge">STEP 1</span><span class="step-title">온라인 스토어 클릭</span></div>
<p>Shopify에 접속한 뒤 왼쪽 메뉴의 <b>온라인 스토어</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/favicon-apply-01.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 2</span><span class="step-title">테마 편집하기 클릭</span></div>
<p><b>테마 편집하기</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/favicon-apply-02.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 3</span><span class="step-title">좌측 상단 톱니바퀴 클릭</span></div>
<p>편집 화면 <b>좌측 상단의 톱니바퀴</b>(테마 설정)를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/favicon-apply-03.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 4</span><span class="step-title">로고 클릭</span></div>
<p>설정 목록에서 <b>로고</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/favicon-apply-04.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 5</span><span class="step-title">로고 → 선택 클릭</span></div>
<p><b>로고</b> 항목의 <b>선택</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/favicon-apply-05.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 6</span><span class="step-title">파일 추가 클릭</span></div>
<p><b>파일 추가</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/favicon-apply-06.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 7</span><span class="step-title">로고 파일 불러오기</span></div>
<p>앞에서 만든 <b>로고 파일</b>을 불러옵니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/favicon-apply-07.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 8</span><span class="step-title">파일 선택 → 완료</span></div>
<p>업로드가 끝나면 해당 파일을 선택한 뒤 <b>완료</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/favicon-apply-08.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 9</span><span class="step-title">로고 확인 → 파비콘 선택</span></div>
<p>로고 부분에 파일이 잘 올라갔는지 확인합니다. 잘 올라갔다면 <b>붉은색 체크 표시</b> 자리에 로고가 보입니다. 이어서 <b>파비콘</b> 항목의 <b>선택</b>을 클릭합니다.</p>
<div class="callout note"><div class="callout-label">※ 참고</div><p>로고가 보이는 <b>위치</b>는 사용자가 설정한 값에 따라 다를 수 있습니다.</p></div>
<figure class="shot"><img loading="lazy" src="manual/images/favicon-apply-09.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 10</span><span class="step-title">파비콘 파일 추가 → 완료</span></div>
<p>로고와 같은 방법으로 <b>파비콘 파일</b>도 추가한 뒤 <b>완료</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/favicon-apply-10.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 11</span><span class="step-title">파비콘 확인</span></div>
<p>파비콘도 잘 올라갔다면 설정이 된 것입니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/favicon-apply-11.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 12</span><span class="step-title">저장</span></div>
<p>모두 끝났다면 <b>우측 상단 저장</b> 버튼을 눌러 저장합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/favicon-apply-12.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 13</span><span class="step-title">"…" 클릭</span></div>
<p>저장이 완료되면 상단의 <b>"…"</b> 부분을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/favicon-apply-13.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 14</span><span class="step-title">보기 클릭</span></div>
<p><b>보기</b>를 클릭해 스토어를 엽니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/favicon-apply-14.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 15</span><span class="step-title">브라우저 탭에서 파비콘 확인</span></div>
<p>주소창 위 <b>브라우저 탭</b>에 파비콘이 잘 적용됐는지 확인하면 끝입니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/favicon-apply-15.webp" alt=""></figure>
<div class="callout overview"><div class="callout-label">✅ 마무리</div><p>로고는 스토어 헤더에, 파비콘은 브라우저 탭에 보이면 완료입니다. 나중에 바꾸고 싶으면 같은 경로(테마 편집하기 → 톱니바퀴 → 로고/파비콘)에서 파일만 교체하면 됩니다.</p></div>
$body$ where slug = 'favicon';
