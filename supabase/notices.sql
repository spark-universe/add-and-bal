-- ============================================================
-- 휴일 · 공지 (notices) — 수강생 화면 상단 배너 + 하루 1회 팝업, 캘린더 휴일 표시, '일정 밀기'의 기준
--  · kind='holiday': from_date~to_date 가 수강생·어드민 캘린더에 색칠되고 "진행 없음" 칩으로 표시.
--                    어드민 '일정 관리 → 휴일·공지'에서 등록하고, 같은 곳의 '일정 밀기'로
--                    예약 공개 챕터(cohort_manual)·숙제 시작/마감(challenges)을 휴일의 평일 수만큼 뒤로 옮긴다.
--  · kind='info'   : 배너/팝업만.
--  · show_from ~ show_until 동안만 수강생에게 보인다(show_until 비면 계속). cohort 가 null 이면 전체 기수.
--  · popup: 처음 접속 시 팝업(하루 1회, 브라우저 localStorage 로 '오늘 봤음' 기억).
--  · shift_applied_at: 이 휴일로 '일정 밀기'를 적용한 시각 — 두 번 밀리는 실수를 막기 위한 표시.
--  Supabase SQL Editor 에서 실행. 멱등. 머지 전에 실행(화면은 표가 없으면 조용히 건너뜀).
-- ============================================================
create table if not exists public.notices (
  id bigint generated always as identity primary key,
  kind text not null default 'info' check (kind in ('holiday', 'info')),
  title text not null,
  body text,
  from_date date,                          -- 휴일 시작 (kind='holiday')
  to_date date,                            -- 휴일 끝, 포함 (kind='holiday')
  show_from timestamptz not null default now(),
  show_until timestamptz,
  cohort int,                              -- null = 전체 기수
  popup boolean not null default true,
  shift_applied_at timestamptz,
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now(),
  constraint notices_holiday_dates check (
    kind <> 'holiday' or (from_date is not null and to_date is not null and to_date >= from_date)
  )
);
create index if not exists notices_show_idx  on public.notices (show_from, show_until);
create index if not exists notices_dates_idx on public.notices (from_date, to_date);

alter table public.notices enable row level security;

-- 조회: 로그인한 사람은 전체 대상 + 자기 기수 대상 (어드민은 전부)
drop policy if exists "notices_select" on public.notices;
create policy "notices_select" on public.notices for select to authenticated using (
  public.is_admin()
  or cohort is null
  or cohort = (select p.cohort from public.profiles p where p.id = auth.uid())
);
-- 등록/수정/삭제: 어드민만
drop policy if exists "notices_write" on public.notices;
create policy "notices_write" on public.notices for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- 확인 — 오류 없이 0(또는 등록 수)이 나오면 정상
select count(*) as 공지수 from public.notices;
