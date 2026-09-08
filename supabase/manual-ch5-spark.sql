-- ============================================================
-- 챕터 5 (slug=spark) 제목 '스파크 기본 설정' + 본문 교체
--  · 상단 비용 경고(따라 하면 앱 비용 청구 가능 → 정독만 해도 됨)
--  · 소메뉴 2개: 설치 방법 / 기본 설정 (data-subnav)
--  Supabase SQL Editor 에서 실행. (이미지: manual/images/spark-install-*, spark-basic-*)
-- ============================================================
update public.manual_chapters set title = '스파크 기본 설정', body = $body$<div class="callout danger"><div class="callout-label">🚨 꼭 읽어주세요 — 비용 안내</div><p><b>이 단원(스파크 기본 설정)을 실제로 따라 진행하시면 일부 앱·서비스 이용에 비용이 청구될 수 있습니다.</b></p><p>지금 바로 설치·연동하지 않아도 됩니다. <b>매뉴얼은 정독(눈으로 익히기)만 하셔도 충분</b>하며, 실제 진행은 준비가 되었을 때 하셔도 됩니다.</p></div>

<h3 class="subhead">스파크 기본 설정</h3>
<div class="callout overview"><div class="callout-label">이 챕터 개요</div><p><b>스파크</b>는 상품을 대량으로 수집(소싱)해 Shopify 스토어로 업로드해 주는 프로그램입니다. 이 챕터에서는 <b>설치 방법</b>과 Shopify와 연결하는 <b>기본 설정</b>을 순서대로 진행합니다.</p></div>

<h3 class="subsection" id="spark-install" data-subnav="설치 방법">설치 · 회원가입 방법</h3>
<div class="callout note"><div class="callout-label">⚠ 중요</div><p>버전이 다르게 보여도 진행 과정은 동일합니다. 다만 <b>최신 버전 사용을 권장</b>하며, 이전 버전이 있다면 <b>꼭 삭제한 뒤</b> 설치해 주세요. (26/08/18 기준 <b>1.0.3 버전 이상</b>)</p></div>
<div class="callout note"><div class="callout-label">📥 다운로드 주소</div><p>아래 주소에서 스파크 최신 버전을 받습니다.<br><code>drive.google.com/drive/folders/1MrBlM5PlYpVHUzRoKrcx82BZBYuz_HwE</code></p></div>

<div class="step"><span class="step-badge">STEP 1</span><span class="step-title">최신 버전 선택</span></div>
<p>다운로드 주소에 접속해 <b>스파크 최신 버전</b>을 클릭합니다. (이미지와 버전 표기가 다를 수 있어요.)</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-install-01.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 2</span><span class="step-title">다운로드</span></div>
<p><b>다운로드</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-install-02.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 3</span><span class="step-title">다운로드 진행</span></div>
<p>이어지는 화면에서 <b>다운로드</b>를 한 번 더 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-install-03.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 4</span><span class="step-title">다운로드 완료 후 실행</span></div>
<p>다운로드가 끝나면 파일을 실행합니다. (왼쪽: 브라우저 최근 다운로드 기록 / 오른쪽: 내 컴퓨터 → 다운로드 폴더)</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-install-04.png" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/spark-install-05.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 5</span><span class="step-title">압축 풀기</span></div>
<p>내려받은 파일의 <b>압축을 풉니다</b>. (반디집·알집 등 어떤 압축 프로그램을 써도 됩니다.)</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-install-06.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 6</span><span class="step-title">Setup 실행</span></div>
<p>압축을 푼 폴더에서 <b>Spark.n.n.n-setup</b> 파일을 실행합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-install-07.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 7</span><span class="step-title">추가 정보</span></div>
<p>보안 안내가 뜨면 <b>추가 정보</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-install-08.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 8</span><span class="step-title">실행</span></div>
<p><b>실행</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-install-09.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 9</span><span class="step-title">설치 완료</span></div>
<p>설치가 완료됩니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-install-10.png" alt=""></figure>

<h3 class="subhead">스파크 회원가입</h3>
<div class="callout note"><div class="callout-label">💡 참고</div><p>이미 가입한 계정이 있다면 추가로 가입할 필요 없이 그대로 사용하시면 됩니다.</p></div>

<div class="step"><span class="step-badge">STEP 10</span><span class="step-title">회원가입 클릭</span></div>
<p>스파크를 실행한 뒤 <b>회원가입</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-install-11.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 11</span><span class="step-title">정보 기입 후 가입</span></div>
<p>내용을 기입하고 <b>회원가입</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-install-12.png" alt=""></figure>

<div class="callout note"><div class="callout-label">📌 승인 요청</div><p>가입 후 카카오톡 플러스 채널로 <b>(이름 / 스파크 아이디) 스파크 승인 요청 드립니다</b> 형식으로 문의해 주세요.<br>※ 아이디 재발행은 어려울 수 있으니 <b>아이디·비밀번호는 꼭 별도로 메모</b>해 두세요.</p></div>


<h3 class="subsection" id="spark-basic" data-subnav="기본 설정">Shopify 연동 (기본 설정)</h3>
<div class="callout overview"><div class="callout-label">이 절 개요</div><p>스파크를 Shopify와 연결합니다. 흐름은 <b>Shopify 개발자 대시보드에서 앱 생성 → Client ID / Client Secret 발급 → 스파크에 입력 → 스토어 설치·연동 확인</b> 순서입니다. 스크린샷을 그대로 따라오면 됩니다.</p></div>
<div class="callout note"><div class="callout-label">🎥 영상으로 먼저 보기(권장)</div><p>설정 과정을 영상으로 한 번 보고 아래 순서를 따라오면 더 쉽습니다.<br><code>drive.google.com/drive/folders/1kD1tjVgENuXEmUj5Gqhc-O_VnNIqCteK</code></p></div>

<div class="step"><span class="step-badge">STEP 1</span><span class="step-title">스파크 설정 화면 열기</span></div>
<p>스파크 접속 → <b>설정</b>으로 이동합니다. 여기에 <b>스토어 이름 · Client ID · Client Secret</b>을 입력하게 됩니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-basic-01.png" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/spark-basic-02.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 2</span><span class="step-title">개발자 대시보드 열기</span></div>
<p>설정 하단의 <b>개발자 대시보드</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-basic-03.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 3</span><span class="step-title">스토어 로그인</span></div>
<p>로그인 화면이 뜨면 <b>스파크에 사용할 스토어</b>로 로그인합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-basic-04.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 4</span><span class="step-title">Create app</span></div>
<p>로그인 후 우측 상단 <b>Create app</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-basic-05.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 5</span><span class="step-title">앱 이름 입력 · Create</span></div>
<p>App 이름을 작성하고 <b>Create</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-basic-06.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 6</span><span class="step-title">Scopes · Redirect URLs 입력</span></div>
<p><b>Scopes</b>와 <b>Redirect URLs</b>에 스파크가 안내하는 값을 각각 입력한 뒤, 우측 하단 <b>Release</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-basic-07.png" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/spark-basic-08.png" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/spark-basic-09.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 7</span><span class="step-title">Release</span></div>
<p>name·message는 비워 둔 채 우측 하단 <b>Release</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-basic-10.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 8</span><span class="step-title">생성한 앱 열기</span></div>
<p>방금 <b>생성한 앱</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-basic-11.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 9</span><span class="step-title">Setting 열기</span></div>
<p>좌측 메뉴에서 <b>Setting</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-basic-12.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 10</span><span class="step-title">Client ID / Secret 입력</span></div>
<p>Setting에 표시되는 <b>Client ID / Client Secret</b>을 스파크 설정에 입력합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-basic-13.png" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/spark-basic-14.png" alt=""></figure>
<div class="callout note"><div class="callout-label">💡 참고</div><p>Client Secret은 오른쪽의 <b>눈동자 아이콘</b>을 클릭해야 값이 보입니다.</p></div>

<div class="step"><span class="step-badge">STEP 11</span><span class="step-title">스토어 이름 · 마진 입력</span></div>
<p>스파크 설정의 <b>스토어 이름</b>에 쇼피파이 도메인을 입력하고, <b>마진</b>을 설정한 뒤 <b>연동하기</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-basic-15.png" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/spark-basic-16.png" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/spark-basic-17.png" alt=""></figure>
<div class="callout note"><div class="callout-label">⚠ 중요</div><p>스토어 이름에는 도메인 뒤의 <b>.myshopify.com은 빼고</b> 입력하세요. (자동으로 붙습니다.) 마진은 <b>퍼센트·가격</b>으로 설정할 수 있습니다.</p></div>

<div class="step"><span class="step-badge">STEP 12</span><span class="step-title">스토어에 앱 설치</span></div>
<p>쇼피파이 스토어로 이동해 앱 설치를 진행합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-basic-18.png" alt=""></figure>
<figure class="shot"><img loading="lazy" src="manual/images/spark-basic-19.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 13</span><span class="step-title">연동 확인</span></div>
<p>스파크에서 스토어 <b>연동</b>이 되었는지 확인합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/spark-basic-20.png" alt=""></figure>

<div class="callout overview"><div class="callout-label">✅ 마무리</div><p>업로드할 때 <b>데이터 관리 상단</b>에서 어떤 스토어로 올릴지 선택할 수 있습니다. 여기까지 되면 기본 설정 완료입니다.</p></div>
<figure class="shot"><img loading="lazy" src="manual/images/spark-basic-21.png" alt=""></figure>
$body$ where slug = 'spark';
