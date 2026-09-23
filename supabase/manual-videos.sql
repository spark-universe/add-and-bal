-- ============================================================
-- 매뉴얼 영상 링크를 본문(HTML)에서 분리 — manual_chapters.videos (jsonb 배열 [{title, url}])
--  · 어드민 '매뉴얼 영상'(admin/manual-videos.html) 화면에서 챕터별 링크를 붙여넣어 바꿀 수 있게 한다.
--    이후 영상 교체에는 SQL 이 필요 없다.
--  · 링크 형태는 화면(js/manual-video.js)이 자동 판별:
--    구글 드라이브 → '영상 보기' 버튼(새 창) / 유튜브 → 사이트 안 재생 / manual/videos/파일 → 플레이어
--  · 지금까지 본문 안에 직접 넣어 둔 영상 5개(2·9·10·11·12장)를 이 컬럼으로 옮긴다. 본문의 그 자리는
--    <div data-video-slot></div> 로 바꿔 같은 위치에 그려지게 한다. (슬롯이 없는 챕터에 영상을 넣으면 본문 맨 위에 그려짐)
--  · 11·12장은 manual-ch11-12-drive-video.sql 을 아직 실행하지 않았어도 이 파일이 새 본문(개요 + 슬롯)까지 만든다.
--  · 멱등: 다시 실행해도 중복되지 않고, 어드민 화면에서 바꾼 영상을 되돌리지 않는다.
--  · 실행 순서: 머지 전/후 어느 쪽이든 된다(화면이 옛/새 스키마를 모두 처리). 다만 SQL 만 먼저 하고 머지를 미루면
--    그 사이엔 옮긴 영상이 수강생 화면에 안 보이니, 실행한 뒤 곧바로 머지할 것.
--  Supabase SQL Editor 에서 실행.
-- ============================================================

-- 1) 컬럼 (배열만 허용)
alter table public.manual_chapters
  add column if not exists videos jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'manual_chapters_videos_is_array') then
    alter table public.manual_chapters
      add constraint manual_chapters_videos_is_array check (jsonb_typeof(videos) = 'array');
  end if;
end $$;

-- 2) 2장 미국 현지화 — 마켓 절의 자체 호스팅 영상 (영상 자리는 그대로 슬롯으로)
update public.manual_chapters
set body   = replace(body,
               '<div class="mn-video"><video src="manual/videos/localize-market.mp4" controls preload="metadata" playsinline></video></div>',
               '<div data-video-slot></div>'),
    videos = '[{"title": "", "url": "manual/videos/localize-market.mp4"}]'::jsonb
where slug = 'localize' and body like '%manual/videos/localize-market.mp4%';

-- 3) 9장 메가메뉴 — '영상 강의' 절의 자체 호스팅 영상 (절 제목과 안내 callout 은 본문에 그대로 둔다)
update public.manual_chapters
set body   = replace(replace(body,
               '<div class="mn-video"><video src="manual/videos/megamenu.mp4" controls preload="metadata" playsinline></video></div>',
               '<div data-video-slot></div>'),
               '<p class="mn-video-note">▶ 재생이 안 되면 브라우저를 새로고침해 주세요. 전체화면 버튼으로 크게 볼 수 있습니다.</p>',
               ''),
    videos = '[{"title": "", "url": "manual/videos/megamenu.mp4"}]'::jsonb
where slug = 'megamenu' and body like '%manual/videos/megamenu.mp4%';

-- 4) 10장 메인 배너 — 본문은 개요 + 슬롯만
update public.manual_chapters
set body = $body$<h3 class="subhead">메인 배너</h3>
<div class="callout overview"><div class="callout-label">이 챕터 개요</div><p><b>히어로 배너</b>는 고객이 스토어에 들어왔을 때 가장 먼저 보이는 영역입니다. 아래 영상을 보고 그대로 따라 하시면 됩니다.</p></div>

<div data-video-slot></div>
$body$,
    videos = '[{"title": "", "url": "manual/videos/banner.mp4"}]'::jsonb
where slug = 'banner' and body not like '%data-video-slot%';

-- 5) 11장 카테고리 바로가기 · 12장 추천 상품 — 드라이브 공유 링크(2026-09-23), 본문은 개요 + 슬롯만
update public.manual_chapters
set body = $body$<h3 class="subhead">카테고리 바로가기</h3>
<div class="callout overview"><div class="callout-label">이 챕터 개요</div><p>스토어 메인 화면에서 고객이 원하는 카테고리로 바로 이동하게 해 주는 영역을 만듭니다. 아래 영상을 보고 그대로 따라 하시면 됩니다.</p></div>

<div data-video-slot></div>
$body$,
    videos = '[{"title": "", "url": "https://drive.google.com/file/d/1Nen9l5Di8But3iERG2Oi_-LEc2W5F50Q/view"}]'::jsonb
where slug = 'category' and body not like '%data-video-slot%';

update public.manual_chapters
set body = $body$<h3 class="subhead">추천 상품</h3>
<div class="callout overview"><div class="callout-label">이 챕터 개요</div><p>스토어 메인 화면에 추천 상품(신상품) 영역을 넣어 고객에게 먼저 보여 줄 상품을 배치합니다. 아래 영상을 보고 그대로 따라 하시면 됩니다.</p></div>

<div data-video-slot></div>
$body$,
    videos = '[{"title": "", "url": "https://drive.google.com/file/d/1DzZdjP9bqE0JfO-6Dqb5ReFE0dooC290/view"}]'::jsonb
where slug = 'featured' and body not like '%data-video-slot%';

-- 확인 — 다섯 챕터 모두: 영상수 1 / 슬롯 true / 본문에영상남음 false 이면 정상
select slug, title,
       jsonb_array_length(videos)          as 영상수,
       videos->0->>'url'                   as 영상링크,
       (body like '%data-video-slot%')     as 슬롯,
       (body like '%class="mn-video"%' or body like '%drive.google.com%') as 본문에영상남음
from public.manual_chapters
where slug in ('localize', 'megamenu', 'banner', 'category', 'featured')
order by sort;
