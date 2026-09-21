-- ============================================================
-- 지각 제출 허용 + 표시 + 면제 (v2: 지각 판정 = '제출 일시', 제출 건 단위 면제 추가)
--  · 수강생은 마감 후에도 숙제를 제출할 수 있다. 대신 '지각'으로 표시된다.
--  · challenge_submissions.submitted_at — 수강생이 '제출 확정'(재제출 포함)할 때마다 트리거가 서버 시간(now())으로 갱신.
--    지각 판정은 이 '제출 일시' 기준. 어드민의 검수·면제 저장은 이 시각을 건드리지 않는다.
--  · challenge_submissions.late_waived — 어드민이 검수 창에서 "이 제출만 정상 처리" 한 것. 수강생은 못 켠다.
--  · profiles.late_ok — "이 수강생은 앞으로도 지각을 정상 처리". 검수 창과 사용자 관리 양쪽에서 켜고 끈다. 수강생은 못 켠다.
--  ※ 순서: security-hardening.sql 보다 '나중에', 머지보다 '먼저' 실행. 이전 버전을 이미 실행했어도 그대로 다시 실행하면 됨(멱등).
-- ============================================================

-- 1) 컬럼
alter table public.profiles              add column if not exists late_ok      boolean not null default false;
alter table public.challenge_submissions add column if not exists submitted_at timestamptz;
alter table public.challenge_submissions add column if not exists late_waived  boolean not null default false;

-- 2) 제출 일시 기록 + 면제 컬럼 보호 (BEFORE INSERT/UPDATE)
--    · 수강생(비어드민)이 status != 'draft' 로 저장 → submitted_at = now()  (첫 확정이든 재제출이든 '제출 일시' 갱신)
--    · 초안 저장은 시각 유지 · 어드민의 갱신(검수·면제)은 시각 유지
--    · late_waived 는 어드민만 바꿀 수 있다 (수강생이 보내면 무시)
create or replace function public.set_chsub_submitted_at()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare adm boolean := public.is_admin();
begin
  if tg_op = 'INSERT' then
    new.submitted_at := case when new.status is distinct from 'draft' then now() else null end;
    if not adm then new.late_waived := false; end if;
  else
    if adm then
      new.submitted_at := old.submitted_at;
    elsif new.status is distinct from 'draft' then
      new.submitted_at := now();
    else
      new.submitted_at := old.submitted_at;
    end if;
    if not adm then new.late_waived := old.late_waived; end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_chsub_submitted_at on public.challenge_submissions;
create trigger trg_chsub_submitted_at
  before insert or update on public.challenge_submissions
  for each row execute function public.set_chsub_submitted_at();

-- 3) 기존 확정 행 백필 — created_at 으로 (정상 제출을 지각으로 잘못 표시하는 일은 없음. 앞으로의 제출은 정확)
update public.challenge_submissions
set submitted_at = created_at
where submitted_at is null and status is distinct from 'draft';

-- 4) 프로필 보호 트리거 최종본 + late_ok (security-hardening.sql 의 정의와 동일하게 유지할 것)
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

-- 확인 — 확정 제출 중 submitted_at 이 채워진 비율 (둘이 같아야 정상)
select count(*) as 확정제출, count(submitted_at) as 시각기록됨
from public.challenge_submissions where status is distinct from 'draft';
