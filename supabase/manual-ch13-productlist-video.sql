-- ============================================================
-- 챕터 13 '제품 리스트'(slug=productlist) 본문 교체 — 기존 글/이미지 매뉴얼 삭제, 영상으로 대체
--  · 기존 글·이미지 본문은 더 이상 쓰지 않아 통째로 걷어낸다. 본문은 개요 + 영상 슬롯(<div data-video-slot></div>)만.
--  · 영상 링크는 어드민 '매뉴얼 영상' 화면(manual_chapters.videos)에서 붙여넣는다 — 이 파일은 videos 를 건드리지 않는다.
--    (링크를 넣기 전까지는 개요만 보임)
--  Supabase SQL Editor 에서 실행. 멱등. 머지 불필요(DB 만 바뀜).
-- ============================================================
update public.manual_chapters set body = $body$<h3 class="subhead">제품 리스트</h3>
<div class="callout overview"><div class="callout-label">이 챕터 개요</div><p>스토어에서 상품들이 나열되는 <b>제품 리스트(컬렉션 페이지)</b> 화면을 구성합니다. 아래 영상을 보고 그대로 따라 하시면 됩니다.</p></div>

<div data-video-slot></div>
$body$ where slug = 'productlist';

-- 확인 — 슬롯 있음 / 옛 이미지 없음 / 영상수(어드민에서 넣기 전이면 0)
select slug, title,
       (body like '%data-video-slot%')  as 슬롯,
       (body like '%manual/images/%')   as 옛이미지남음,
       jsonb_array_length(videos)       as 영상수,
       length(body)                     as 본문길이
from public.manual_chapters where slug = 'productlist';
