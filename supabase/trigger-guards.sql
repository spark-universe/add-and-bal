-- ============================================================
-- 보호 트리거 3종에 '로그인 없는 맥락' 가드 추가
--  문제: protect_profile_fields / protect_chsub_review / protect_submission_review 가
--        "어드민이 아니면 수강생"으로 판단했다. SQL 편집기·서비스 롤에서는 로그인 사용자가 없어(auth.uid() = NULL)
--        is_admin() 이 false → 어드민이 SQL 로 일괄 수정한 기수·등급·열람권한·검수 결과가 '조용히 원래 값으로' 되돌아갔다.
--        (2026-09-21 지각 트리거 사고와 같은 부류)
--  수정: "auth.uid() 가 있고 어드민이 아닐 때"만 보호한다. 로그인 없는 맥락은 문장이 준 값을 그대로 둔다.
--  안전: 로그인 없는(anon) PostgREST 요청은 RLS(UPDATE 정책이 전부 '소유자 = auth.uid() or is_admin()')에서
--        이미 한 행도 갱신하지 못하므로, 가드가 실제로 통과시키는 것은 SQL 편집기·서비스 롤뿐이다.
--        로그인한 수강생에 대한 보호는 그대로. 어드민도 그대로.
--  이 파일이 세 함수의 정식 정의다. 저장소의 다른 사본(setup.sql, security-hardening.sql, late-submissions.sql,
--  protect-review-fields.sql, add-*.sql)도 같은 가드 줄로 맞춰 두었으므로 어느 파일을 다시 실행해도 회귀하지 않는다.
--  Supabase SQL Editor 에서 실행. 멱등.
-- ============================================================

-- 1) 프로필 보호 컬럼 (level/role/status/cohort/enroll_date/is_demo/access/late_ok)
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is not null and not public.is_admin() then   -- 로그인 없는 맥락(SQL 편집기·서비스 롤)은 신뢰: 통과
    new.level       := old.level;
    new.role        := old.role;
    new.status      := old.status;
    new.cohort      := old.cohort;
    new.enroll_date := old.enroll_date;
    new.is_demo     := old.is_demo;
    new.access      := old.access;
    new.late_ok     := old.late_ok;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_protect_profile on public.profiles;
create trigger trg_protect_profile
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- 2) 숙제 제출 검수 결과 보호 (review_status/review_reason/reviewed_at/score)
create or replace function public.protect_chsub_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then   -- 로그인 없는 맥락은 신뢰: 통과
    if new.review_status is distinct from old.review_status
       and new.review_status in ('pass','fail') then
      new.review_status := old.review_status;
      new.review_reason := old.review_reason;
      new.reviewed_at   := old.reviewed_at;
    end if;
    if new.score is distinct from old.score and new.score is not null then
      new.score := old.score;
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_protect_chsub on public.challenge_submissions;
create trigger trg_protect_chsub before update on public.challenge_submissions
  for each row execute function public.protect_chsub_review();

-- 3) 자료 제출(옛 4종) 검수 결과 보호
create or replace function public.protect_submission_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin()   -- 로그인 없는 맥락은 신뢰: 통과
     and new.review_status is distinct from old.review_status
     and new.review_status in ('pass','fail') then
    new.review_status := old.review_status;
    new.review_reason := old.review_reason;
    new.reviewed_at   := old.reviewed_at;
  end if;
  return new;
end; $$;
drop trigger if exists trg_protect_submission on public.submissions;
create trigger trg_protect_submission before update on public.submissions
  for each row execute function public.protect_submission_review();

-- 확인 — 세 함수 모두 가드가 들어갔는지 (전부 true 여야 함)
select p.proname as 함수, position('auth.uid() is not null' in p.prosrc) > 0 as 가드있음
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('protect_profile_fields', 'protect_chsub_review', 'protect_submission_review')
order by 1;
