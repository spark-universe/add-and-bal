-- ============================================================
-- 챕터 11 '카테고리 바로가기'(slug=category) · 12 '추천 상품'(slug=featured) — 글 매뉴얼 삭제, 드라이브 영상으로 대체
--  · 기존 글/이미지 본문은 쓸 수 없어 통째로 걷어낸다. 본문은 개요 + 영상 슬롯(<div data-video-slot></div>)만.
--  · 영상 자체는 manual_chapters.videos 컬럼(어드민 '매뉴얼 영상' 화면에서 교체 가능). 컬럼은 manual-videos.sql 이 만든다.
--    ※ manual-videos.sql 을 실행했다면 이 두 챕터는 이미 같은 상태이므로 이 파일은 따로 실행할 필요가 없다.
--  · 드라이브 링크는 화면이 자동으로 '영상 보기' 버튼(새 창)으로 그린다 — 드라이브 임베드는 서드파티 쿠키 차단으로 사이트 안 재생이 안 됨.
--    (드라이브 파일은 '링크가 있는 모든 사용자 - 뷰어'로 공유돼 있어야 함)
--  Supabase SQL Editor 에서 실행. 멱등. 머지 불필요(DB 만 바뀜).
-- ============================================================

-- 11. 카테고리 바로가기
update public.manual_chapters set body = $body$<h3 class="subhead">카테고리 바로가기</h3>
<div class="callout overview"><div class="callout-label">이 챕터 개요</div><p>스토어 메인 화면에서 고객이 원하는 카테고리로 바로 이동하게 해 주는 영역을 만듭니다. 아래 영상을 보고 그대로 따라 하시면 됩니다.</p></div>

<div data-video-slot></div>
$body$ where slug = 'category';

-- 12. 추천 상품
update public.manual_chapters set body = $body$<h3 class="subhead">추천 상품</h3>
<div class="callout overview"><div class="callout-label">이 챕터 개요</div><p>스토어 메인 화면에 추천 상품(신상품) 영역을 넣어 고객에게 먼저 보여 줄 상품을 배치합니다. 아래 영상을 보고 그대로 따라 하시면 됩니다.</p></div>

<div data-video-slot></div>
$body$ where slug = 'featured';

-- 영상 링크 초기값(2026-09-23 공유 링크) — 비어 있을 때만 (어드민 화면에서 바꾼 값은 유지)
update public.manual_chapters
set videos = '[{"title": "", "url": "https://drive.google.com/file/d/1Nen9l5Di8But3iERG2Oi_-LEc2W5F50Q/view"}]'::jsonb
where slug = 'category' and videos = '[]'::jsonb;
update public.manual_chapters
set videos = '[{"title": "", "url": "https://drive.google.com/file/d/1DzZdjP9bqE0JfO-6Dqb5ReFE0dooC290/view"}]'::jsonb
where slug = 'featured' and videos = '[]'::jsonb;

-- 확인 — 두 챕터 모두 영상 1개 / 슬롯 있음 / 옛 이미지 없음
select slug, title,
       jsonb_array_length(videos)       as 영상수,
       videos->0->>'url'                as 영상링크,
       (body like '%data-video-slot%')  as 슬롯,
       (body like '%manual/images/%')   as 옛이미지남음,
       length(body)                     as 본문길이
from public.manual_chapters where slug in ('category', 'featured') order by sort;
