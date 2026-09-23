-- ============================================================
-- 챕터 10 '메인 배너'(slug=banner) 본문 교체 — 기존 글 매뉴얼 삭제, 영상으로 대체
--  · 기존 PageFly 기반 글/이미지 매뉴얼(36스텝 상당)은 더 이상 쓰지 않아 통째로 걷어낸다.
--  · 본문은 개요 + 영상 슬롯(<div data-video-slot></div>)만. 영상 자체는 manual_chapters.videos 컬럼에 있고
--    어드민 '매뉴얼 영상' 화면에서 링크를 바꿀 수 있다. (컬럼은 manual-videos.sql 이 만든다 — 그 파일을 먼저 실행)
--  · 소메뉴(data-subnav)는 항목이 하나뿐이라 넣지 않는다.
--  Supabase SQL Editor 에서 실행. 멱등. (초기 영상 manual/videos/banner.mp4 는 배포에 포함돼 있음)
-- ============================================================
update public.manual_chapters set body = $body$<h3 class="subhead">메인 배너</h3>
<div class="callout overview"><div class="callout-label">이 챕터 개요</div><p><b>히어로 배너</b>는 고객이 스토어에 들어왔을 때 가장 먼저 보이는 영역입니다. 아래 영상을 보고 그대로 따라 하시면 됩니다.</p></div>

<div data-video-slot></div>
$body$ where slug = 'banner';

-- 영상 링크 초기값 — 비어 있을 때만 (어드민 화면에서 바꾼 값은 유지)
update public.manual_chapters
set videos = '[{"title": "", "url": "manual/videos/banner.mp4"}]'::jsonb
where slug = 'banner' and videos = '[]'::jsonb;

-- 확인 — 영상 1개 / 슬롯 있음 / 옛 글·이미지 없음
select slug, title,
       jsonb_array_length(videos)       as 영상수,
       (body like '%data-video-slot%')  as 슬롯,
       (body like '%manual/images/%')   as 옛이미지남음,
       length(body)                     as 본문길이
from public.manual_chapters where slug = 'banner';
