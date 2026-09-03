-- ============================================================
-- 챕터 2 '미국 현지화 실습'(slug=localize) 본문 교체
--  · 절 순서: 마켓 → 세금 → 배송
--  · 마켓 절: 구글 드라이브 영상 임베드 + UI 업데이트 안내 문구
--  · 세금 절: 노션 실제 자료(대한민국 10%→0, 미국 캘리포니아 판매세)
--  · 배송 절: 기존 내용 정돈(일부 이미지 준비 중)
--  · 각 절 제목의 data-subnav → 사이드바 소메뉴(마켓/세금/배송) 자동 생성
--  Supabase SQL Editor 에서 실행. (이미지 localize-tax-01~12.png 는 배포로 함께 올라감)
--  영상: 드라이브 파일이 '링크가 있는 모든 사용자-뷰어'로 공유돼 있어야 재생됨.
-- ============================================================
update public.manual_chapters set body = $body$<h3 class="subsection" id="localize-market" data-subnav="마켓">마켓 설정</h3>
<div class="callout overview"><div class="callout-label">이 절 개요</div><p>마켓(Markets) 설정은 스토어가 판매할 <b>국가·지역</b>을 관리하는 기본 설정입니다. 마켓이 제대로 설정되어 있지 않으면 특정 국가 고객의 접속·결제 과정에서 국가·통화·언어·배송 조건이 정상 적용되지 않을 수 있습니다.</p><p>미국 판매를 기준으로 새 마켓을 만들고, 조건에 미국을 추가한 뒤 저장하는 순서로 진행합니다.</p></div>

<div class="callout note"><div class="callout-label">⚠ 중요</div><p>※ 마켓은 현재 쇼피파이 UI 업데이트로 인하여 “설정 → 마켓”이 아닌 쇼피파이 초기 접속 화면에서 <b>“Markets” 또는 “시장”</b>을 참조해 주세요!</p></div>
<p>마켓 설정은 아래 영상을 보고 그대로 따라 하시면 됩니다. (Markets 메뉴 → 마켓 생성 → 조건에 미국 추가 → 저장)</p>
<div class="mn-video"><iframe src="https://drive.google.com/file/d/1JhoVcOQ1EUesqnDMqQoTHoONMt64Stjw/preview" allow="autoplay; fullscreen" allowfullscreen loading="lazy" title="마켓 설정 영상"></iframe></div>
<p class="mn-video-note">영상이 보이지 않으면 <a href="https://drive.google.com/file/d/1JhoVcOQ1EUesqnDMqQoTHoONMt64Stjw/view" target="_blank" rel="noopener">새 창에서 바로 보기</a></p>

<h3 class="subhead">마켓 설정 시 주의사항</h3>
<p>마켓 설정은 판매 국가·통화·언어·도메인·결제·배송 설정과 연결되는 기본 설정입니다. 미국 판매라면 미국 마켓이 활성화되어 있어야 하고, 이후 배송·세금 설정에서도 미국이 정상적으로 연결되어 있는지 함께 확인하는 것이 좋습니다.</p>

<h3 class="subhead">최종 확인 체크리스트</h3>
<ul class="bullets"><li>Markets 메뉴에 접속했는지 확인</li><li>마켓 생성 → 조건 추가를 진행했는지 확인</li><li>국가/지역에서 미국을 선택하고 완료했는지 확인</li><li>저장 후 미국 마켓이 활성 상태로 표시되는지 확인</li></ul>

<div class="callout quiz"><div class="callout-label">✓ 확인 문제</div><ol class="quiz-list"><li>마켓(Markets) 메뉴에서 관리하는 핵심 항목은 무엇인가요?</li><li>미국 판매를 위해 마켓 조건에 어떤 국가를 추가해야 하나요?</li><li>마켓 설정이 현지화에서 중요한 이유를 한 문장으로 정리해 보세요.</li></ol></div>


<h3 class="subsection" id="localize-tax" data-subnav="세금">세금 및 관세 설정</h3>
<div class="callout overview"><div class="callout-label">이 절 개요</div><p>미국 판매 스토어는 결제 시 <b>판매세(Sales Tax)</b>가 올바르게 계산되도록 세금을 설정해야 합니다. 핵심은 두 가지예요. ① 기본으로 잡혀 있는 <b>대한민국 10% 부가세를 0%</b>로 바꾸고, ② 실제 판매 대상인 <b>미국의 주(예: 캘리포니아)에 판매세 징수</b>를 켜는 것입니다.</p><p>아래 순서를 화면 그대로 따라 하면 됩니다.</p></div>

<div class="step"><span class="step-badge">STEP 1</span><span class="step-title">설정 열기</span></div>
<p>쇼피파이 관리자에 접속한 뒤, 왼쪽 아래 <b>설정</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/localize-tax-01.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 2</span><span class="step-title">세금 및 관세 메뉴</span></div>
<p>설정 목록에서 <b>세금 및 관세</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/localize-tax-02.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 3</span><span class="step-title">대한민국 선택</span></div>
<p>국가 목록에서 <b>대한민국</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/localize-tax-03.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 4</span><span class="step-title">대한민국 세율(10%) 열기</span></div>
<p>대한민국 옆에 표시된 <b>10%</b> 부분을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/localize-tax-04.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 5</span><span class="step-title">0%로 변경 후 저장</span></div>
<p>세율을 <b>0</b>으로 바꾸고 <b>저장</b>을 클릭합니다. 그런 다음 다시 <b>세금 및 관세</b> 화면으로 돌아갑니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/localize-tax-05.png" alt=""></figure>
<div class="callout note"><div class="callout-label">⚠ 중요</div><p>한국 부가세(10%)를 그대로 두면 미국 고객 결제에 불필요한 세금이 붙을 수 있어요. 꼭 <b>0%</b>로 바꿔 주세요.</p></div>

<div class="step"><span class="step-badge">STEP 6</span><span class="step-title">미국 선택</span></div>
<p>국가 목록에서 <b>미국</b>을 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/localize-tax-06.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 7</span><span class="step-title">새로운 지역에서 징수</span></div>
<p><b>세금을 징수 중인 지역</b> 항목에서 <b>새로운 지역에서 징수</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/localize-tax-07.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 8</span><span class="step-title">지역 선택 열기</span></div>
<p><b>선택</b> 부분을 클릭해 주(State) 목록을 엽니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/localize-tax-08.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 9</span><span class="step-title">캘리포니아 주 설정</span></div>
<p>주 목록에서 <b>캘리포니아(California)</b>를 선택합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/localize-tax-09.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 10</span><span class="step-title">판매세 징수</span></div>
<p>캘리포니아 주가 맞는지 확인한 뒤 <b>판매세 징수</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/localize-tax-10.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 11</span><span class="step-title">세금 및 관세로 돌아가기</span></div>
<p>징수 지역이 추가된 것을 확인하고 다시 <b>세금 및 관세</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/localize-tax-11.png" alt=""></figure>

<div class="step"><span class="step-badge">STEP 12</span><span class="step-title">미국 세금 징수 확인</span></div>
<p>미국의 세금 징수 부분에 <b>✔ 표시</b>가 됐는지 확인합니다. 표시가 되어 있으면 설정이 정상적으로 완료된 것입니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/localize-tax-12.png" alt=""></figure>

<h3 class="subhead">세금 설정 시 주의사항</h3>
<p>세금 설정은 단순한 화면 설정이 아니라 실제 판매 지역의 세금 규정과 연결됩니다. 예시에서는 캘리포니아를 켰지만, 실제 운영에서는 본인의 판매 현황과 세금 책임 기준에 따라 필요한 주를 선택해야 합니다. 세금 신고·납부와 관련된 부분은 세무 담당자와 확인하는 것이 안전합니다.</p>

<h3 class="subhead">최종 확인 체크리스트</h3>
<ul class="bullets"><li>대한민국 세율을 0%로 바꾸고 저장했는지 확인</li><li>미국 → 새로운 지역에서 징수를 진행했는지 확인</li><li>캘리포니아(또는 필요한 주)를 선택하고 판매세 징수를 켰는지 확인</li><li>미국 세금 징수에 ✔ 표시가 됐는지 확인</li></ul>

<div class="callout quiz"><div class="callout-label">✓ 확인 문제</div><ol class="quiz-list"><li>대한민국 세율을 0%로 바꾸는 이유는 무엇인가요?</li><li>미국의 특정 주에 판매세 징수를 켜려면 어떤 버튼부터 눌러야 하나요?</li><li>예시로 든 캘리포니아를 그대로 켜면 되나요, 아니면 무엇을 기준으로 정해야 하나요?</li></ol></div>


<h3 class="subsection" id="localize-shipping" data-subnav="배송">배송 설정</h3>
<div class="callout overview"><div class="callout-label">이 절 개요</div><p>배송 설정은 고객이 결제 화면에서 <b>배송 가능 여부와 배송비</b>를 볼 수 있게 하는 필수 설정입니다. 배송 지역이나 옵션이 없으면 고객이 주문을 완료하지 못할 수 있으니, 스토어 오픈 전 반드시 확인하세요.</p><p>기본 배송 프로필을 기준으로 배송 지역을 추가하고, 배송 옵션을 설정한 뒤 저장하는 순서로 진행합니다.</p></div>

<div class="step"><span class="step-badge">STEP 1</span><span class="step-title">배송 프로필 접속하기</span></div>
<p>관리자 페이지 왼쪽 메뉴에서 <b>배송</b>으로 이동한 뒤, 기본으로 생성되어 있는 <b>일반 프로필</b>을 클릭합니다. 별도로 배송 조건을 나누지 않는다면 대부분 이 프로필에서 설정하면 됩니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/image326.jpg" alt=""></figure>

<div class="step"><span class="step-badge">STEP 2</span><span class="step-title">배송 지역 추가하기</span></div>
<p>일반 프로필 화면 아래쪽 <b>배송 지역</b> 항목에서, 아직 지역이 없다면 고객이 결제할 수 있도록 배송 가능 지역을 추가해야 합니다. <b>지역 추가</b> 버튼을 클릭합니다.</p>
<div class="img-missing">🖼 이미지 준비 중</div>

<div class="step"><span class="step-badge">STEP 3</span><span class="step-title">배송할 국가 및 지역 선택하기</span></div>
<p>새 배송 지역 창에서 배송할 국가·지역을 선택합니다. 예시로 <b>북아메리카</b>와 <b>미국</b>을 선택합니다. 미국 판매 스토어라면 최소한 <b>미국</b>은 반드시 선택되어 있어야 합니다.</p>
<div class="img-missing">🖼 이미지 준비 중</div>

<div class="step"><span class="step-badge">STEP 4</span><span class="step-title">선택한 배송 지역 완료하기</span></div>
<p>국가·지역을 선택했다면 우측 하단의 <b>완료</b>를 클릭합니다. 완료를 눌러야 선택한 지역이 프로필에 반영됩니다.</p>
<div class="img-missing">🖼 이미지 준비 중</div>

<div class="step"><span class="step-badge">STEP 5</span><span class="step-title">배송 옵션 추가하기</span></div>
<p>배송 지역을 추가했다면 그 지역 안에 <b>배송 옵션</b>을 추가해야 합니다. 옵션이 없으면 고객이 결제 단계에서 배송 방법을 선택할 수 없습니다. 추가된 지역 안에서 <b>배송 옵션 추가</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/image313.jpg" alt=""></figure>

<div class="step"><span class="step-badge">STEP 6</span><span class="step-title">배송 옵션 설정하기</span></div>
<p>고객에게 보여질 배송 방법을 설정합니다. 예시 기준은 다음과 같습니다.</p>
<ul class="bullets"><li>이름: 이코노미</li><li>요금 유형: 고정</li><li>요금: $7.90</li><li>운송 시간: 3 ~ 5 영업일</li></ul>
<p>이름은 결제 화면에 표시되는 옵션명, 요금은 고객이 낼 배송비, 운송 시간은 예상 배송 기간입니다. 입력을 마치면 우측 상단의 <b>완료</b>를 클릭합니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/image323.jpg" alt=""></figure>

<div class="step"><span class="step-badge">STEP 7</span><span class="step-title">배송 옵션 조건 변경하기</span></div>
<p>배송 옵션은 운영 방식에 맞게 자유롭게 바꿀 수 있습니다. 무료 배송이면 요금을 <b>$0.00</b>으로, 유료 배송이면 원하는 금액을 입력하면 됩니다. 배송 기간도 실제 공급처 기준으로 조정하세요. 예시는 3~5 영업일이지만, 실제 기간이 더 길다면 고객 문의를 줄이기 위해 현실적인 기간으로 설정하는 것이 좋습니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/image321.jpg" alt=""></figure>

<div class="step"><span class="step-badge">STEP 8</span><span class="step-title">최종 저장하기</span></div>
<p>배송 지역과 옵션을 모두 추가했다면 우측 상단의 <b>저장</b>을 클릭합니다. 저장하지 않으면 설정이 반영되지 않을 수 있습니다. 저장 후 <b>이코노미 / 3~5 영업일 / $7.90</b>처럼 표시되면 정상적으로 추가된 것입니다.</p>
<figure class="shot"><img loading="lazy" src="manual/images/image325.jpg" alt=""></figure>

<h3 class="subhead">최종 확인 체크리스트</h3>
<ul class="bullets"><li>일반 프로필에 접속했는지 확인</li><li>배송 지역(미국 또는 판매 국가)이 추가되어 있는지 확인</li><li>배송 옵션 이름·요금·운송 시간이 입력되어 있는지 확인</li><li>마지막에 저장 버튼을 눌렀는지 확인</li></ul>

<div class="callout quiz"><div class="callout-label">✓ 확인 문제</div><ol class="quiz-list"><li>배송 지역/배송 프로필을 설정하는 이유는 무엇인가요?</li><li>미국 내 배송을 위해 어떤 지역을 배송 대상으로 추가해야 하나요?</li><li>배송비 요금은 어떤 방식으로 설정할 수 있나요?</li></ol></div>
$body$ where slug = 'localize';
