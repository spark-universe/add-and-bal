-- ============================================================
-- 지각 제출 허용 + 표시 + 면제자 지정
--  · 수강생은 마감 후에도 숙제를 제출할 수 있다(클라이언트에서 막던 것을 풂). 대신 '지각'으로 표시된다.
--  · challenge_submissions.submitted_at — 제출을 '처음 확정'한 시각. 트리거가 서버 시간(now())으로 기록하므로
--    수강생이 PC 시계를 바꿔도 못 속인다. 미통과 후 재제출해도 처음 확정 시각을 유지한다(지각 판정은 첫 제출 기준).
--  · profiles.late_ok — 어드민이 고른 수강생. true 면 지각해도 정상 제출로 취급(지각 표시 안 함).
--    수강생이 스스로 켤 수 없도록 protect_profile_fields 보호 목록에 넣는다.
--  ※ 순서: 이 SQL 을 '먼저' 실행한 뒤 머지. (반대로 하면 late_ok 컬럼이 없어 어드민 검수 목록·현황판 조회가 실패함)
--  Supabase SQL Editor 에서 실행. 멱등. security-hardening.sql 보다 나중에 실행할 것(보호 함수를 덮어씀).
-- ============================================================

-- 1) 컬럼
alter table public.profiles              add column if not exists late_ok      boolean not null default false;
alter table public.challenge_submissions add column if not exists submitted_at timestamptz;

-- 2) 확정 시각 기록 트리거 (첫 확정만. draft 저장은 건드리지 않음)
create or replace function public.set_chsub_submitted_at()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.status is distinct from 'draft' then new.submitted_at := now(); else new.submitted_at := null; end if;
  else
    if new.status is distinct from 'draft' and (old.status = 'draft' or old.submitted_at is null) then
      new.submitted_at := now();            -- draft → 확정 (또는 옛 행의 첫 확정)
    else
      new.submitted_at := old.submitted_at; -- 재제출·검수 등 그 외 갱신은 유지 (클라이언트가 보내도 무시)
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_chsub_submitted_at on public.challenge_submissions;
create trigger trg_chsub_submitted_at
  before insert or update on public.challenge_submissions
  for each row execute function public.set_chsub_submitted_at();

-- 3) 기존 확정 행 백필 — created_at 으로. (초안을 마감 전에 만들고 늦게 확정한 경우 지각으로 안 잡힐 수는 있으나,
--    반대로 '정상 제출을 지각으로 잘못 표시'하는 일은 없다. updated_at 은 검수 시각으로 밀려 있을 수 있어 쓰지 않음)
update public.challenge_submissions
set submitted_at = created_at
where submitted_at is null and status is distinct from 'draft';

-- 4) 프로필 보호 트리거 최종본 + late_ok (security-hardening.sql 의 정의를 그대로 잇고 한 줄 추가)
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
    new.access      := old.access;
    new.late_ok     := old.late_ok;   -- 지각 면제는 어드민만
  end if;
  return new;
end;
$$;
drop trigger if exists trg_protect_profile on public.profiles;
create trigger trg_protect_profile
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- 확인 — 확정 제출 중 submitted_at 이 채워진 비율 (전부여야 정상)
select count(*) as 확정제출, count(submitted_at) as 시각기록됨
from public.challenge_submissions where status is distinct from 'draft';
