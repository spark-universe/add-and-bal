-- ============================================================
-- 이미지 WebP 전환에 따른 매뉴얼 본문 이미지 경로 일괄 변경
--  · manual/images 의 스크린샷 553장을 PNG/JPG -> WebP 로 바꿨다 (68MB -> 23MB).
--    본문(manual_chapters.body)에 박혀 있는 .png / .jpg 참조를 .webp 로 바꿔야 이미지가 보인다.
--  · WebP 가 오히려 더 커서 원본(PNG)을 그대로 둔 4장은 다시 .png 로 되돌린다.
--  · 멱등: 여러 번 실행해도 안전 (이미 .webp 인 것은 패턴에 걸리지 않음).
--  ※ 반드시 '배포(머지) 후'에 실행할 것. 먼저 실행하면 아직 없는 .webp 를 가리키게 된다.
--  Supabase SQL Editor 에서 실행.
-- ============================================================

-- 1) 모든 이미지 참조를 .webp 로
update public.manual_chapters
set body = regexp_replace(body, '(manual/images/[A-Za-z0-9_-]+)\.(png|jpg|jpeg)', '\1.webp', 'g')
where body like '%manual/images/%';

-- 2) 원본(PNG)을 유지한 4장만 되돌리기
update public.manual_chapters
set body = replace(replace(replace(replace(body,
      'manual/images/collection-create-16.webp', 'manual/images/collection-create-16.png'),
      'manual/images/favicon-make-03.webp',      'manual/images/favicon-make-03.png'),
      'manual/images/spark-how-18.webp',         'manual/images/spark-how-18.png'),
      'manual/images/spark-install-09.webp',     'manual/images/spark-install-09.png')
where body like '%manual/images/%';

-- 3) 확인 — 챕터별 이미지 참조 수. '구형참조'는 위 4장(png)만 남아야 정상.
select slug, title,
       (length(body) - length(replace(body, '.webp', ''))) / 5  as webp참조,
       (length(body) - length(replace(body, '.png',  ''))) / 4  as 구형참조_png,
       (length(body) - length(replace(body, '.jpg',  ''))) / 4  as 구형참조_jpg
from public.manual_chapters
where body like '%manual/images/%'
order by sort;
