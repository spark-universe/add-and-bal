-- ============================================================
-- 챕터 9 '메가메뉴'(slug=megamenu) — 영상 강의 추가
--  · 기존 본문(36스텝 글 매뉴얼)은 그대로 두고, 맨 앞에 '영상 강의' 섹션만 덧붙인다.
--    (본문을 통째로 갈아끼우지 않으므로 그동안 DB에서 정리한 내용 — 확인 문제·타임스탬프 제거 — 이 유지됨)
--  · 소메뉴 2개(순서): 영상 강의 → 글 매뉴얼  (data-subnav)
--  · 멱등: 이미 영상이 들어간 경우(where 조건) 다시 실행해도 중복 추가되지 않음
--  · 영상 자체는 manual_chapters.videos 컬럼(어드민 '매뉴얼 영상' 화면에서 교체 가능)에 있고, 본문에는 슬롯만 둔다.
--    컬럼은 manual-videos.sql 이 만든다 — 그 파일을 먼저 실행.
--  Supabase SQL Editor 에서 실행.
-- ============================================================
update public.manual_chapters
set body = $add$<h3 class="subsection" id="megamenu-video" data-subnav="영상 강의">메가메뉴 영상 강의</h3>
<div class="callout note"><div class="callout-label">🎬 영상으로 먼저 보기</div><p>메가메뉴를 <b>처음부터 끝까지 따라 하는 영상</b>입니다. 전체 흐름을 한 번 눈으로 익힌 뒤, 아래 <b>글 매뉴얼</b>을 보며 직접 따라 하시면 훨씬 수월합니다.</p></div>
<div data-video-slot></div>

<h3 class="subsection" id="megamenu-text" data-subnav="글 매뉴얼">글로 보는 메가메뉴 설정</h3>
$add$ || body
where slug = 'megamenu'
  and body is not null
  and body not like '%megamenu-video%';   -- 이미 추가돼 있으면 건너뜀

-- 영상 링크 초기값 — 비어 있을 때만 (어드민 화면에서 바꾼 값은 유지)
update public.manual_chapters
set videos = '[{"title": "", "url": "manual/videos/megamenu.mp4"}]'::jsonb
where slug = 'megamenu' and videos = '[]'::jsonb;

-- 확인 — 영상 섹션이 들어갔는지 / 소메뉴 앵커 2개가 잡히는지
select slug, title,
       (body like '%megamenu-video%') as 영상섹션,
       (body like '%megamenu-text%')  as 글섹션,
       jsonb_array_length(videos)       as 영상수,
       length(body) as 본문길이
from public.manual_chapters where slug = 'megamenu';
