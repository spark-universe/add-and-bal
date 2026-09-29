-- ============================================================
-- 챕터 15 '블로그 작성'(slug=blog) 본문 교체
--  · 소메뉴 3개(순서): Essential AI Blog(앱으로 생성, 22스텝 + GPT 활용 추가) → GPT(직접 작성, 17스텝) → 구현(섹션 추가, 7스텝)
--  · 출처: notion/블로그 (블로그 생성_Essentail AI Blog / 블로그 생성_GPT / 블로그 구현하기)
--  · 프롬프트는 복사 버튼 블록(.mn-prompt), 바꿔 쓸 부분은 노란색(mark.fill)
--  Supabase SQL Editor 에서 실행. ※ 머지(배포) 후 실행 — 이미지가 배포로 함께 올라감: manual/images/blog-ess-*, blog-ess-gpt-*, blog-gpt-*, blog-impl-*
-- ============================================================
update public.manual_chapters set body = $body$<h3 class="subhead">블로그 작성</h3>
<div class="callout overview"><div class="callout-label">이 챕터 개요</div><p>스토어에 <b>블로그 글</b>을 올리면 검색 유입이 늘고 브랜드 신뢰도가 높아집니다. 블로그를 만드는 방법은 두 가지입니다.<br>① <b>Essential AI Blog 앱</b>으로 자동 생성 (무료 3개) &nbsp;② <b>ChatGPT</b>로 글을 써서 직접 등록<br>글을 만든 뒤에는 <b>구현</b> 절을 따라 스토어 메인 화면에 블로그 섹션을 추가합니다.</p></div>


<h3 class="subsection" id="blog-essential" data-subnav="Essential AI Blog">블로그 생성 ① — Essential AI Blog 앱</h3>
<div class="callout note"><div class="callout-label">💡 전체 흐름</div><p>앱 설치 → ChatGPT로 블로그 <b>제목</b> 뽑기 → 앱에 제목·톤·키워드 입력 → <b>Generate</b> → 생성된 글 확인</p></div>

<div class="step"><span class="step-badge">STEP 1</span><span class="step-title">검색창 열기</span></div>
<p>쇼피파이 관리자 화면 <b>상단 검색창</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-ess-01.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 2</span><span class="step-title">앱 클릭</span></div>
<p>검색창 아래의 <b>앱</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-ess-02.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 3</span><span class="step-title">앱 검색</span></div>
<p><b>Essential AI Blog</b>를 입력해 검색합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-ess-03.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 4</span><span class="step-title">앱 선택</span></div>
<p>검색 결과에서 해당 앱을 클릭합니다. ※ 이미 설치돼 있다면 <b>STEP 6</b>으로 건너뛰세요.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-ess-04.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 5</span><span class="step-title">설치</span></div>
<p><b>설치</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-ess-05.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 6</span><span class="step-title">Create a blog post</span></div>
<p><b>Create a blog Post</b>를 클릭합니다. ※ 이미 블로그를 만든 적이 있다면 우측 상단의 <b>New Blog Post</b>를 클릭하세요.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-ess-06.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 7</span><span class="step-title">ChatGPT 접속</span></div>
<p>새 탭에서 <b>ChatGPT</b>에 접속합니다. 블로그 제목을 먼저 뽑기 위해서입니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-ess-07.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 8</span><span class="step-title">블로그 토픽 뽑기</span></div>
<p>아래 프롬프트를 입력합니다. <b>어떤 샵을 운영하는지, 무엇을 원하는지</b> 등 조건을 자유롭게 추가할수록 결과가 좋아집니다.</p>
<div class="mn-prompt"><div class="mn-prompt__head"><span>📋 프롬프트 ① 블로그 토픽 5개 — 노란색 부분만 바꿔서 사용</span><button type="button" class="mn-copy">복사</button></div><pre>내가 쇼피파이에서 <mark class="fill">건강기능식품샵</mark>을 운영할 거야
이때 블로그를 작성할 건데 블로그 토픽 좀 좋은 거 5개 뽑아서 알려줘
미국에서 미국으로 드랍쉬핑할 예정이야. 이 점 참고해서 작성해.
영문으로 알려줘</pre></div>
<figure class="shot"><img loading="lazy" src="manual/images/blog-ess-08.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 9</span><span class="step-title">제목 하나 복사</span></div>
<p>생성된 제목 중 마음에 드는 것 하나를 복사합니다. ※ 이 매뉴얼은 2번째 제목을 선택했습니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-ess-09.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 10</span><span class="step-title">Post topic 입력</span></div>
<p>쇼피파이 앱 화면으로 돌아와 <b>Post topic</b>에 복사한 제목을 붙여넣습니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-ess-10.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 11</span><span class="step-title">Tone 선택</span></div>
<p><b>Tone</b>에서 <b>Professional</b>을 선택합니다. 다른 톤을 골라도 됩니다.</p>
<ul class="bullets"><li><b>Informal</b> — 격식 없이 편안한 느낌</li><li><b>Professional</b> — 전문적인 느낌</li><li><b>Persuasive</b> — 설득력 있는 느낌</li><li><b>Informative</b> — 정보 중심의 느낌</li><li><b>Humorous</b> — 유머러스한 느낌</li><li><b>Friendly</b> — 친근한 느낌</li></ul>
<figure class="shot"><img loading="lazy" src="manual/images/blog-ess-11.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 12</span><span class="step-title">핵심 키워드 뽑기</span></div>
<p>다시 ChatGPT로 가서 제목을 붙여넣고 아래 프롬프트를 입력합니다. 키워드는 원하는 개수만큼 뽑아도 됩니다.</p>
<div class="mn-prompt"><div class="mn-prompt__head"><span>📋 프롬프트 ② 핵심 키워드 — 노란색 부분만 바꿔서 사용</span><button type="button" class="mn-copy">복사</button></div><pre><mark class="fill">Why Americans Are Switching to Natural Supplements: A 2025 Wellness Trend</mark>
이 주제로 블로그 작성할 건데 핵심 키워드 3개만 알려줘</pre></div>
<figure class="shot"><img loading="lazy" src="manual/images/blog-ess-12.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 13</span><span class="step-title">키워드 복사</span></div>
<p>추출된 핵심 키워드 3개를 <b>한 개씩</b> 복사합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-ess-13.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 14</span><span class="step-title">Keywords 입력</span></div>
<p><b>Keywords</b> 칸에 한 개씩 붙여넣은 뒤 아래에 뜨는 <b>Add ‘키워드명’</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-ess-14.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 15</span><span class="step-title">나머지 키워드도 동일하게</span></div>
<p>다른 키워드도 같은 방법으로 추가합니다.</p>
<div class="callout danger"><div class="callout-label">⚠ 주의</div><p>체크 표시된 네모 박스를 클릭하면 키워드가 <b>지워집니다</b>. 꼭 <b>Add ‘키워드명’</b> 부분을 클릭하세요.</p></div>
<figure class="shot"><img loading="lazy" src="manual/images/blog-ess-15.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 16</span><span class="step-title">Generate outline</span></div>
<p><b>Generate outline</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-ess-16.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 17</span><span class="step-title">Generate blog post</span></div>
<p>생성된 개요(outline)를 확인한 뒤 하단의 <b>Generate blog post</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-ess-17.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 18</span><span class="step-title">생성 대기</span></div>
<p>블로그 글이 만들어질 때까지 잠시 기다립니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-ess-18.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 19</span><span class="step-title">Open blog post</span></div>
<p><b>Open blog post</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-ess-19.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 20</span><span class="step-title">생성된 블로그 확인</span></div>
<p>제목·본문·이미지가 들어간 블로그 글이 만들어졌는지 확인합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-ess-20.webp" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/blog-ess-21.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 21</span><span class="step-title">쇼피파이에서 확인</span></div>
<p>쇼피파이 관리자 <b>콘텐츠 → 블로그 게시물</b>에서도 생성된 글이 보입니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-ess-22.webp" alt=""></figure>

<div class="callout danger"><div class="callout-label">⚠ 무료 사용 한도</div><p>Essential AI Blog는 블로그 글을 <b>최대 3개까지만 무료</b>로 만들 수 있습니다. 그 이상은 아래 <b>GPT 활용</b> 방법을 사용하세요.</p></div>

<h3 class="subhead">추가 — 개요(outline)만 앱에서 뽑고 글은 ChatGPT로 쓰기</h3>
<p>무료 3개를 다 썼거나 글을 직접 다듬고 싶을 때 쓰는 방법입니다. 앱에서 개요까지만 만들고(STEP 16), 글은 ChatGPT가 씁니다.</p>

<div class="step"><span class="step-badge">STEP 1</span><span class="step-title">outline 열기</span></div>
<p>앱에서 <b>outline</b>을 클릭합니다. (위 STEP 16까지 진행한 상태)</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-ess-gpt-01.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 2</span><span class="step-title">개요 복사</span></div>
<p>생성된 개요를 전부 복사합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-ess-gpt-02.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 3</span><span class="step-title">ChatGPT에 글 요청</span></div>
<p>ChatGPT에 개요를 붙여넣고 아래 문장을 이어서 입력합니다.</p>
<div class="mn-prompt"><div class="mn-prompt__head"><span>📋 프롬프트 ③ 개요로 글 쓰기 — 노란색 부분에 개요를 붙여넣기</span><button type="button" class="mn-copy">복사</button></div><pre><mark class="fill">(여기에 복사한 개요 붙여넣기)</mark>
위 개요를 통해 블로그 글 하나 영어로 만들어줘</pre></div>
<figure class="shot"><img loading="lazy" src="manual/images/blog-ess-gpt-03.webp" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/blog-ess-gpt-04.webp" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/blog-ess-gpt-05.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 4</span><span class="step-title">글 복사</span></div>
<p>ChatGPT가 만든 블로그 글을 복사합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-ess-gpt-06.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 5</span><span class="step-title">쇼피파이에 붙여넣고 저장</span></div>
<p>쇼피파이 <b>콘텐츠 → 블로그 게시물</b>에서 글을 열어 붙여넣고 저장합니다. 등록 방법은 아래 <b>GPT</b> 절의 STEP 9 이후와 같습니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-ess-gpt-07.webp" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/blog-ess-gpt-08.webp" alt=""></figure>


<h3 class="subsection" id="blog-gpt" data-subnav="GPT">블로그 생성 ② — ChatGPT로 직접 작성</h3>
<div class="callout note"><div class="callout-label">💡 전체 흐름</div><p>블로그 게시물 생성 → ChatGPT로 <b>제목 → 글 → 이미지</b> 만들기 → 쇼피파이에 붙여넣기 → 이미지 추가 → 공개·저장</p></div>

<div class="step"><span class="step-badge">STEP 1</span><span class="step-title">콘텐츠</span></div>
<p>쇼피파이 관리자 왼쪽 메뉴에서 <b>콘텐츠</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-gpt-01.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 2</span><span class="step-title">블로그 게시물</span></div>
<p><b>블로그 게시물</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-gpt-02.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 3</span><span class="step-title">블로그 게시물 생성</span></div>
<p><b>블로그 게시물 생성</b>을 클릭합니다. ※ 이미 블로그가 있다면 우측 상단의 <b>블로그 생성</b>을 클릭하세요.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-gpt-03.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 4</span><span class="step-title">ChatGPT 접속</span></div>
<p>새 탭에서 <b>ChatGPT</b>에 접속합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-gpt-04.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 5</span><span class="step-title">블로그 토픽 정하기</span></div>
<p>아래 프롬프트를 입력합니다. 명령어는 자유롭게 써도 되지만 <b>어떤 샵을 운영할지, 무엇을 원하는지, 추가 조건</b>을 상세히 쓸수록 결과가 좋습니다.</p>
<div class="mn-prompt"><div class="mn-prompt__head"><span>📋 프롬프트 ① 블로그 토픽 — 노란색 부분만 바꿔서 사용</span><button type="button" class="mn-copy">복사</button></div><pre><mark class="fill">건강기능식품샵</mark>을 운영할건데 이와 관련된 블로그 글을 작성할 거야.
이때 사용될 수 있는 블로그 토픽 좀 정해줘
대상은 미국에서 할 것이고, 미국에서 미국으로 드랍쉬핑 하는거야.
이 점 참고해서 영문으로 알려줘</pre></div>
<figure class="shot"><img loading="lazy" src="manual/images/blog-gpt-05.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 6</span><span class="step-title">제목 선택</span></div>
<p>생성된 리스트 중에서 원하는 제목을 하나 고릅니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-gpt-06.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 7</span><span class="step-title">블로그 글 요청</span></div>
<p>고른 제목으로 글을 써 달라고 요청합니다. 조건을 더 걸고 싶으면 덧붙이세요. (예: “vitamin의 효능은 꼭 넣어줘”)</p>
<div class="mn-prompt"><div class="mn-prompt__head"><span>📋 프롬프트 ② 블로그 글 작성 — 노란색 부분만 바꿔서 사용</span><button type="button" class="mn-copy">복사</button></div><pre><mark class="fill">Top 5 Daily Supplements for Busy Professionals in the U.S.</mark> 이 내용 기반으로 작성 할 것인데 이와 관련돼서 블로그 글 작성해줘</pre></div>
<figure class="shot"><img loading="lazy" src="manual/images/blog-gpt-07.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 8</span><span class="step-title">글 복사</span></div>
<p>결과물이 나오면 복사합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-gpt-08.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 9</span><span class="step-title">제목·내용 붙여넣기</span></div>
<p>쇼피파이로 돌아와 <b>제목</b>에는 처음 정한 제목을, <b>내용</b>에는 ChatGPT가 쓴 글을 붙여넣습니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-gpt-09.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 10</span><span class="step-title">이미지 생성</span></div>
<p>다시 ChatGPT에서 글에 맞는 이미지를 만들어 달라고 합니다.</p>
<div class="mn-prompt"><div class="mn-prompt__head"><span>📋 프롬프트 ③ 이미지 생성</span><button type="button" class="mn-copy">복사</button></div><pre>이제 해당 글에 맞는 이미지를 생성해줘</pre></div>
<figure class="shot"><img loading="lazy" src="manual/images/blog-gpt-10.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 11</span><span class="step-title">이미지 다운로드</span></div>
<p>생성된 이미지를 다운로드합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-gpt-11.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 12</span><span class="step-title">이미지 추가</span></div>
<p>쇼피파이 블로그 글로 돌아와 <b>이미지 추가</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-gpt-12.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 13</span><span class="step-title">이미지 선택</span></div>
<p>다운로드한 이미지를 선택해 올립니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-gpt-13.webp" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/blog-gpt-14.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 14</span><span class="step-title">이미지 적용</span></div>
<p>업로드가 끝나면 이미지를 선택합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-gpt-15.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 15</span><span class="step-title">공개 → 저장</span></div>
<p>오른쪽 공개 상태에서 <b>공개</b>를 선택하고 <b>저장</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-gpt-16.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 16</span><span class="step-title">확인</span></div>
<p><b>콘텐츠 → 블로그 게시물</b>에서 생성된 글을 확인합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-gpt-17.webp" alt=""></figure>


<h3 class="subsection" id="blog-impl" data-subnav="구현">블로그 구현 — 스토어 화면에 섹션 추가</h3>
<div class="callout note"><div class="callout-label">💡 전체 흐름</div><p>온라인 스토어 → 사용자 지정 → <b>섹션 추가</b> → 블로그 게시물 → 블로그 선택 → 확인</p></div>

<div class="step"><span class="step-badge">STEP 1</span><span class="step-title">온라인 스토어</span></div>
<p>쇼피파이 관리자 왼쪽 메뉴에서 <b>온라인 스토어</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-impl-01.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 2</span><span class="step-title">사용자 지정</span></div>
<p><b>사용자 지정</b>을 클릭해 테마 편집기를 엽니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-impl-02.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 3</span><span class="step-title">섹션 추가</span></div>
<p>왼쪽 목록에서 <b>섹션 추가</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-impl-03.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 4</span><span class="step-title">블로그 게시물</span></div>
<p><b>블로그 게시물</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-impl-04.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 5</span><span class="step-title">블로그 선택</span></div>
<p>섹션 설정에서 <b>선택</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-impl-05.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 6</span><span class="step-title">뉴스</span></div>
<p>블로그 목록에서 <b>뉴스</b>(기본 블로그)를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-impl-06.webp" alt=""></figure>

<div class="step"><span class="step-badge">STEP 7</span><span class="step-title">확인</span></div>
<p>메인 화면에 블로그 글이 표시되는지 확인합니다. 섹션 제목은 <b>제목</b> 칸에서 바꿀 수 있습니다. 저장을 잊지 마세요.</p>
<figure class="shot"><img loading="lazy" src="manual/images/blog-impl-07.webp" alt=""></figure>

<h3 class="subhead">최종 확인 체크리스트</h3>
<ul class="bullets"><li>블로그 글이 <b>콘텐츠 → 블로그 게시물</b>에 공개 상태로 있는지 확인</li><li>글에 대표 이미지가 들어갔는지 확인</li><li>테마 편집기에서 블로그 게시물 섹션을 추가하고 <b>저장</b>했는지 확인</li><li>스토어 메인 화면에서 블로그 섹션이 보이는지 확인</li></ul>
$body$ where slug = 'blog';

-- 확인 — 소메뉴 앵커 3개(Essential AI Blog / GPT / 구현)와 이미지 수(54)가 맞는지
select slug, title,
       (body like '%id="blog-essential"%') as 에센셜절,
       (body like '%id="blog-gpt"%')       as GPT절,
       (body like '%id="blog-impl"%')      as 구현절,
       (length(body) - length(replace(body, 'manual/images/blog-', ''))) / length('manual/images/blog-') as 이미지수,
       length(body) as 본문길이
from public.manual_chapters where slug = 'blog';
