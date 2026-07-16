-- =========================================================
--  교재(레슨) 기능 제거 — 스토어 초기작업 매뉴얼로 대체하면서 정리
--  Supabase 대시보드 > SQL Editor 에 붙여넣고 한 번 실행하세요.
--  (되돌릴 수 없으니 필요 시 백업 후 실행)
-- =========================================================

-- 1) 과제의 교재 연결 컬럼 제거
alter table public.challenges drop column if exists lesson_id;

-- 2) 교재 테이블 제거
drop table if exists public.lessons cascade;

-- 3) 교재 이미지 버킷 정책 + 객체 + 버킷 제거
drop policy if exists "lesson_img_insert" on storage.objects;
drop policy if exists "lesson_img_delete" on storage.objects;
delete from storage.objects where bucket_id = 'lessons';
delete from storage.buckets where id = 'lessons';
