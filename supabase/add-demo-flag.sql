-- =========================================================
--  공용 데모(테스트) 계정 기능 — 기존 DB에 적용하는 마이그레이션
--  Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하세요.
-- =========================================================

-- 1) profiles 에 데모 플래그 추가 (이미 있으면 무시됨)
alter table public.profiles add column if not exists is_demo boolean not null default false;

-- 2) 수강생이 스스로 데모 플래그를 못 바꾸게 보호 트리거 갱신
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
  end if;
  return new;
end;
$$;

-- =========================================================
--  적용 후 할 일:
--  (A) 공용 데모 계정을 하나 만드세요 — signup.html 에서 회원가입
--      (예: 이메일 demo@yourdomain.com / 비밀번호 공유)
--
--  (B) 그 계정을 '데모 계정'으로 지정 (아래 이메일을 실제 데모 계정 이메일로 교체):
--
--      update public.profiles
--      set is_demo = true, status = 'approved'
--      where id = (select id from auth.users where email = 'demo@yourdomain.com');
--
--  (C) 테스터들에게 그 이메일/비밀번호 공유 → 로그인하면 '광고 설정'만 보임.
--      여러 명이 동시에 로그인해도 각자 브라우저 탭에서 격리되어 작업물이 안 쌓임.
--
--  해제하려면:  update public.profiles set is_demo = false where email = 'demo@yourdomain.com';
-- =========================================================
