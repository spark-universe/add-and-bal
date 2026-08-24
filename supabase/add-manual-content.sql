-- =========================================================
-- 매뉴얼 본문을 DB(manual_chapters)에서 편집 관리
-- - 기존 manual_chapters (slug, title, sort) 에 본문/부/번호/준비중 컬럼 추가
-- - manual.html 이 이 표에서 본문을 읽어 렌더링
-- - 어드민 "매뉴얼 편집" 화면에서 추가/수정/삭제
-- 이미지 업로드는 기존 'materials' 공개 버킷을 재사용합니다.
-- =========================================================

alter table public.manual_chapters
  add column if not exists part text,
  add column if not exists num  text,
  add column if not exists body text,
  add column if not exists soon boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

-- slug 기준 upsert(onConflict:'slug')가 동작하려면 slug에 유니크 제약이 필요
create unique index if not exists manual_chapters_slug_key on public.manual_chapters (slug);

-- 관리자 쓰기 정책 (없으면 생성). 읽기 정책은 기존 것을 그대로 사용.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'manual_chapters'
      and policyname = 'manual_chapters_admin_write'
  ) then
    create policy manual_chapters_admin_write on public.manual_chapters
      for all to authenticated
      using      (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
      with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));
  end if;
end $$;

-- 서버 시간 조회용 함수 (매뉴얼 공개 판단을 로컬 시계가 아니라 서버 시간 기준으로)
create or replace function public.server_now()
  returns timestamptz language sql stable as $$ select now() $$;
grant execute on function public.server_now() to anon, authenticated;

-- 로그인 사용자 읽기 정책 (없을 때만 — 이미 있으면 건너뜀)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'manual_chapters'
      and cmd = 'SELECT'
  ) then
    create policy manual_chapters_read on public.manual_chapters
      for select to authenticated using (true);
  end if;
end $$;
