-- =========================================================
--  등급 관리: 심화 과정 '영역별 열람 권한' (개별 체크)
--  - profiles.access = 열람 허용 영역 키 배열
--    (ohome 심화메인 · basic 기본설정 · ad 광고설정 · practice 발주연습 · cbguide 차지백)
--  - 학생은 스스로 못 바꾸게 보호 트리거에 access 추가
-- =========================================================

alter table public.profiles add column if not exists access text[] not null default '{}';

-- 기존 '숙련자'(level>=1)는 전체 영역 열람으로 이관 (한 번만)
update public.profiles
set access = array['ohome','basic','ad','practice','cbguide']
where coalesce(level, 0) >= 1
  and (access is null or cardinality(access) = 0);

-- 학생이 스스로 access 를 못 바꾸게 보호 트리거 갱신 (level/role/status 등과 동일하게)
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    new.level  := old.level;
    new.role   := old.role;
    new.status := old.status;
    new.cohort := old.cohort;
    new.enroll_date := old.enroll_date;
    new.is_demo := old.is_demo;
    new.access := old.access;
  end if;
  return new;
end;
$$;
