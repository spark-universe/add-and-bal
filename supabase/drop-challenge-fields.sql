-- =========================================================
--  숙제(챌린지) 정리 — 안 쓰는 옛 필드 제거
--  Supabase 대시보드 > SQL Editor 에 붙여넣고 한 번 실행하세요. (되돌릴 수 없음)
-- =========================================================

-- 옛 노션 링크 목록(jsonb), 배점, 분류 컬럼 제거
alter table public.challenges drop column if exists manual;
alter table public.challenges drop column if exists points;
alter table public.challenges drop column if exists category;
