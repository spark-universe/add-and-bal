-- =========================================================
--  숙제에 '관련 자료'(파일 업로드 + 외부 링크) 추가
--  Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하세요.
-- =========================================================

-- 1) challenges 에 자료 컬럼 추가
alter table public.challenges add column if not exists material_url  text;   -- 외부 링크(구글드라이브·노션 등)
alter table public.challenges add column if not exists material_path text;   -- 업로드 파일 경로(materials 버킷)
alter table public.challenges add column if not exists material_name text;   -- 업로드 파일 원본 이름

-- 2) 자료 파일용 공개 버킷 (강의 자료라 로그인 없이도 다운로드 허용, 업로드/삭제는 어드민만)
insert into storage.buckets (id, name, public) values ('materials', 'materials', true)
on conflict (id) do nothing;

drop policy if exists "materials_read" on storage.objects;
create policy "materials_read" on storage.objects for select
  using (bucket_id = 'materials');
drop policy if exists "materials_write" on storage.objects;
create policy "materials_write" on storage.objects for insert
  with check (bucket_id = 'materials' and public.is_admin());
drop policy if exists "materials_update" on storage.objects;
create policy "materials_update" on storage.objects for update
  using (bucket_id = 'materials' and public.is_admin());
drop policy if exists "materials_delete" on storage.objects;
create policy "materials_delete" on storage.objects for delete
  using (bucket_id = 'materials' and public.is_admin());
