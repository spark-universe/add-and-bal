-- =========================================================
-- 보안 강화 마이그레이션 (2026-09 감사 반영)
-- Supabase SQL Editor 에서 그대로 실행. 여러 번 재실행해도 안전(멱등).
-- 실행 후 클라이언트(feature/ad-overhaul)도 함께 배포해야 챌린지 자료 다운로드가 동작.
-- =========================================================

-- ---------- H1. events 수정 정책: scope 재검증 ----------
--  기존 정책은 UPDATE 시 owner_id 만 확인 → 학생이 개인 일정을 만든 뒤
--  scope='all'/'cohort' 로 바꿔 전체/타 기수에 스팸·피싱을 뿌릴 수 있었음.
--  비관리자는 개인(personal) 일정만, 그리고 scope/cohort/created_by 를 못 바꾸게 고정.
drop policy if exists "events_update" on public.events;
create policy "events_update" on public.events for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (
    public.is_admin()
    or (scope = 'personal' and owner_id = auth.uid() and created_by = auth.uid())
  );

-- ---------- M1. 챌린지 조회: 서버에서 기수·공개여부·예약시각 강제 ----------
--  기존: to authenticated using(true) → 학생이 REST 로 모든 기수의 미공개/미래 과제와
--        정답자료 경로(material_path)까지 전부 읽을 수 있었음(클라 필터는 우회 가능).
--  변경: 관리자 전체 / 학생은 본인 기수의 active=true, 공개시각 도래한 것만.
drop policy if exists "challenges_select" on public.challenges;
create policy "challenges_select" on public.challenges for select
  to authenticated using (
    public.is_admin()
    or (
      active = true
      and (open_at is null or open_at <= now())
      and cohort = coalesce((select cohort from public.profiles where id = auth.uid()), 1)
    )
  );

-- ---------- M4. protect_profile_fields 단일 정의(모든 보호 컬럼 + access) ----------
--  이 함수가 setup.sql / add-demo-flag.sql / add-access-areas.sql 에 서로 다른
--  버전으로 3중 정의돼 있어, 나중에 실행되는 것이 이김. access 를 빠뜨린 버전이
--  마지막에 실행되면 학생이 스스로 access 를 열 수 있게 되는 잠재 회귀가 있었음.
--  → 여기서 access 포함 최종본으로 못박는다. (이 파일을 '가장 마지막'에 실행할 것)
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    new.level       := old.level;
    new.role        := old.role;
    new.status      := old.status;
    new.cohort      := old.cohort;
    new.enroll_date := old.enroll_date;
    new.is_demo     := old.is_demo;
    new.access      := old.access;   -- 영역별 열람 권한도 어드민만
  end if;
  return new;
end;
$$;
drop trigger if exists trg_protect_profile on public.profiles;
create trigger trg_protect_profile
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ---------- M3. 챌린지 정답/자료 전용 비공개 버킷(hw-materials) ----------
--  민감하지 않은 매뉴얼 이미지(manual/…, 본문에 public URL 삽입)는 'materials'(공개) 그대로 두고,
--  챌린지 관련자료(hw/…)만 비공개 버킷으로 분리 → 익명 인터넷 접근 차단.
--  읽기는 로그인 사용자만(서명 URL 발급 경유), 업로드/수정/삭제는 어드민만.
insert into storage.buckets (id, name, public)
  values ('hw-materials', 'hw-materials', false)
  on conflict (id) do update set public = false;

drop policy if exists "hw_materials_read" on storage.objects;
create policy "hw_materials_read" on storage.objects for select
  to authenticated using (bucket_id = 'hw-materials');

drop policy if exists "hw_materials_write" on storage.objects;
create policy "hw_materials_write" on storage.objects for insert
  with check (bucket_id = 'hw-materials' and public.is_admin());

drop policy if exists "hw_materials_update" on storage.objects;
create policy "hw_materials_update" on storage.objects for update
  using (bucket_id = 'hw-materials' and public.is_admin());

drop policy if exists "hw_materials_delete" on storage.objects;
create policy "hw_materials_delete" on storage.objects for delete
  using (bucket_id = 'hw-materials' and public.is_admin());

-- 참고: 이미 'materials' 버킷에 올려둔 기존 챌린지 자료(hw/… )가 있다면,
--       스토리지 물리 객체는 SQL 로 옮길 수 없으므로 어드민에서 해당 숙제의
--       '관련 자료'를 한 번 다시 첨부(재업로드)해 주세요. 새로 올리는 것부터
--       자동으로 hw-materials(비공개)로 저장됩니다.
