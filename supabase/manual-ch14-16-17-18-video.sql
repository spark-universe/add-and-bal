-- ============================================================
-- 챕터 14 '브랜드 정보'(brand) · 16 '리뷰'(review) · 17 '푸터 및 정책'(footer) · 18 '팝업창 & 쿠키 설정'(popup)
--  — 기존 글/이미지 매뉴얼 삭제, 영상으로 대체
--  · 본문은 개요 + 영상 슬롯(<div data-video-slot></div>)만. 영상 링크는 어드민 '매뉴얼 영상' 화면(manual_chapters.videos)에서
--    붙여넣는다 — 이 파일은 videos 를 건드리지 않는다. (링크를 넣기 전까지는 개요만 보임)
--  Supabase SQL Editor 에서 실행. 멱등. 머지 불필요(DB 만 바뀜).
-- ============================================================

-- 14. 브랜드 정보
update public.manual_chapters set body = $body$<h3 class="subhead">브랜드 정보</h3>
<div class="callout overview"><div class="callout-label">이 챕터 개요</div><p>스토어의 <b>브랜드 정보(소개) 페이지</b>를 만들어 고객에게 우리 브랜드가 어떤 곳인지 알려 줍니다. 아래 영상을 보고 그대로 따라 하시면 됩니다.</p></div>

<div data-video-slot></div>
$body$ where slug = 'brand';

-- 16. 리뷰
update public.manual_chapters set body = $body$<h3 class="subhead">리뷰</h3>
<div class="callout overview"><div class="callout-label">이 챕터 개요</div><p>상품 페이지에 <b>고객 리뷰</b> 영역을 넣어 구매 신뢰도를 높입니다. 아래 영상을 보고 그대로 따라 하시면 됩니다.</p></div>

<div data-video-slot></div>
$body$ where slug = 'review';

-- 17. 푸터 및 정책
update public.manual_chapters set body = $body$<h3 class="subhead">푸터 및 정책</h3>
<div class="callout overview"><div class="callout-label">이 챕터 개요</div><p>스토어 맨 아래 <b>푸터</b>를 구성하고 환불·배송·개인정보 등 <b>정책 페이지</b>를 연결합니다. 아래 영상을 보고 그대로 따라 하시면 됩니다.</p></div>

<div data-video-slot></div>
$body$ where slug = 'footer';

-- 18. 팝업창 & 쿠키 설정
update public.manual_chapters set body = $body$<h3 class="subhead">팝업창 &amp; 쿠키 설정</h3>
<div class="callout overview"><div class="callout-label">이 챕터 개요</div><p>스토어 진입 시 뜨는 <b>팝업창</b>과 <b>쿠키 동의 배너</b>를 설정합니다. 아래 영상을 보고 그대로 따라 하시면 됩니다.</p></div>

<div data-video-slot></div>
$body$ where slug = 'popup';

-- 확인 — 네 챕터 모두: 슬롯 true / 옛이미지남음 false / 영상수(어드민에서 넣기 전이면 0)
select slug, title,
       (body like '%data-video-slot%')  as 슬롯,
       (body like '%manual/images/%')   as 옛이미지남음,
       jsonb_array_length(videos)       as 영상수,
       length(body)                     as 본문길이
from public.manual_chapters where slug in ('brand', 'review', 'footer', 'popup') order by sort;
