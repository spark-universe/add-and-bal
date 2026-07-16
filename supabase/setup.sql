-- =========================================================
--  발주 & 광고 설정 훈련 — Supabase 초기 설정
--  Supabase 대시보드 > SQL Editor 에 붙여넣고 한 번 실행하세요.
-- =========================================================

-- ---------- 1. 테이블 ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text,
  phone text,
  email text,
  role text default 'student',      -- 'student' | 'admin'
  status text default 'pending',    -- 'pending' | 'approved'
  cohort int default 1,             -- 기수 (1기생, 2기생 ...)
  created_at timestamptz default now()
);
alter table public.profiles add column if not exists cohort int default 1;
update public.profiles set cohort = 1 where cohort is null;

-- 기수(코호트): 번호 + 기수 이름(어드민 전용) + 수강일(수강생 표시)
--  * 수강생은 자기 기수 한 줄만 조회 가능 (다른 기수 존재 자체를 알 수 없음)
--  * label(기수)은 어드민만 봄, enroll_date(수강일)은 수강생에게 보임
create table if not exists public.cohorts (
  id int primary key,               -- 기수 번호 (profiles.cohort 와 매칭)
  label text not null,              -- 기수 이름 (어드민 전용, 예: "1기")
  enroll_date text,                 -- 수강일 (수강생에게 표시, 예: "2026년 7월 15일")
  active boolean default true,      -- 끄면 신규 배정 등에서 숨김
  created_at timestamptz default now()
);
alter table public.cohorts add column if not exists enroll_date text;
insert into public.cohorts (id, label) values (1, '1기')
on conflict (id) do nothing;

-- 발주&광고 훈련 접근 등급: 0 = 챌린지 단계(발주&광고 잠김), 1 = 발주&광고 개방
alter table public.profiles add column if not exists level int default 0;
update public.profiles set level = 0 where level is null;

-- 수강생 개인 수강일 (수강생이 보는 날짜. 이 날짜로 기수가 자동 매칭됨. 예외 시 기수/날짜 따로 수정)
alter table public.profiles add column if not exists enroll_date text;

-- 등급업 신청: 수강생이 신청 → 어드민이 승인/반려
create table if not exists public.level_requests (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade,
  from_level int,
  to_level int,
  status text default 'pending',    -- 'pending' | 'approved' | 'rejected'
  note text,                        -- 반려 사유 등
  created_at timestamptz default now(),
  decided_at timestamptz
);
create index if not exists level_requests_status_idx on public.level_requests (status);

create table if not exists public.stores (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade,
  name text not null,
  topic text,
  url text,
  partner_code text,
  memo text,
  created_at timestamptz default now()
);

create table if not exists public.submissions (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users on delete cascade,
  item text,                        -- 'shop' | 'category' | 'order' | 'amazon'
  file_path text,
  file_name text,
  status text default 'draft',      -- 'draft' | 'confirmed'
  confirmed_at timestamptz,
  review_status text default 'pending',  -- 'pending' | 'pass' | 'fail'
  review_reason text,                    -- 미통과 사유
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  unique (user_id, item)
);

-- 주제(카테고리) — 어드민이 등록한 것만 수강생 드롭다운에 보임
create table if not exists public.topics (
  id bigint generated always as identity primary key,
  name text not null unique,
  active boolean default true,      -- 끄면 수강생 세팅 드롭다운에서 사라짐
  created_at timestamptz default now()
);

-- 발주 연습에 쓰이는 상품 카탈로그 (어드민이 주제별 CSV로 등록, 수강생은 조회만)
--  * 판매가는 저장하지 않는다. 판매가 = 원가 × (1 + 설정마진/100) 으로 주문 생성 시점에 계산됨
create table if not exists public.products (
  id bigint generated always as identity primary key,
  topic text not null,              -- 주제 (주방용품 / 반려동물 ...) → 사용자가 세팅에서 고르는 단위
  name text not null,
  image_url text,                   -- 대표 사진 (목록/썸네일용)
  images jsonb default '[]'::jsonb, -- 상품 사진 전체 (상세 화면에서 넘겨보기)
  cost  numeric(10,2) not null default 0,   -- 아마존 구매 원가
  source_url text,                  -- 원본 상품 링크
  active boolean default true,      -- 끄면 주문 생성에서 제외
  created_at timestamptz default now()
);
-- (이전 버전 스키마를 이미 실행했다면 아래가 컬럼을 맞춰줌)
alter table public.products add column if not exists topic text;
alter table public.products add column if not exists images jsonb default '[]'::jsonb;
alter table public.products drop column if exists price;
alter table public.products drop column if exists category;
create index if not exists products_topic_idx on public.products (topic);

-- 이미 상품에 쓰인 주제가 있다면 topics 테이블로 옮겨둠 (한 번만 실행되면 됨)
insert into public.topics (name)
select distinct topic from public.products where topic is not null
on conflict (name) do nothing;

-- 사용자별 발주 연습 세팅 (order-setup.html 에서 저장 → order-practice.html 이 읽음)
create table if not exists public.practice_settings (
  user_id uuid primary key references auth.users on delete cascade,
  topic text,
  margin numeric(5,2) default 20,   -- 설정 마진 (%) → 판매가 = 원가 × (1 + margin/100)
  order_count int default 30,       -- 이번 연습에서 받을 총 주문 건수
  level text default '중',           -- '하' | '중' | '상' → 함정 주문 빈도
  updated_at timestamptz default now()
);

-- ---------- 매뉴얼 챕터 공개/예약 ----------
--  매뉴얼 본문(manual.html)은 정적 파일이고, 각 챕터의 "공개 여부/예약일"만 여기서 제어한다.
--  visible = status='public' 또는 (status='scheduled' 이고 publish_at <= 지금)
create table if not exists public.manual_chapters (
  slug text primary key,              -- 매뉴얼 섹션 id / 목차 앵커 (예: 'signup')
  title text not null,
  sort int default 0,
  status text default 'public',       -- 'public' | 'hidden' | 'scheduled'
  publish_at timestamptz,             -- 예약 공개 시각
  updated_at timestamptz default now()
);
insert into public.manual_chapters (slug, title, sort) values
  ('signup','쇼피파이 가입 방법',10),
  ('localize','미국 현지화 실습',20),
  ('plan','스토어 구상',30),
  ('sourcing','소싱 앱 소개',40),
  ('spark','스파크 사용법',50),
  ('upload','상품 업로드',60),
  ('collection','컬렉션 설정',70),
  ('favicon','파비콘 · 로고',80),
  ('megamenu','메가메뉴',90),
  ('banner','메인 배너',100),
  ('category','카테고리 바로가기',110),
  ('featured','추천 상품',120),
  ('productlist','제품 리스트',130),
  ('brand','브랜드 정보',140),
  ('blog','블로그 작성',150),
  ('review','리뷰',160),
  ('footer','푸터 및 정책',170),
  ('popup','팝업창 & 쿠키 설정',180)
on conflict (slug) do nothing;

-- 기수별 매뉴얼 챕터 공개/예약 (기수마다 따로 설정)
--  manual_chapters 는 챕터 목록(제목/순서), 실제 "언제 보일지"는 기수별로 여기서 제어
--  행이 없으면 기본 공개. visible = status='public' 또는 (scheduled 이고 publish_at <= 지금)
create table if not exists public.cohort_manual (
  cohort int not null,
  slug text not null,
  status text default 'public',       -- 'public' | 'hidden' | 'scheduled'
  publish_at timestamptz,
  updated_at timestamptz default now(),
  primary key (cohort, slug)
);

-- ---------- 챌린지: 과제 + 제출 ----------
-- 어드민이 등록하는 과제(챌린지)
create table if not exists public.challenges (
  id bigint generated always as identity primary key,
  title text not null,              -- 숙제 제목
  description text,                 -- 숙제 설명
  manual_slug text,                 -- 연결된 매뉴얼 챕터 (manual_chapters.slug)
  cohort int default 1,             -- 기수 (해당 기수 수강생에게만 보임)
  open_at timestamptz,              -- 공개/시작 시각 (기수별 공개에 사용)
  due_at timestamptz,               -- 마감일시
  active boolean default false,     -- 기본 비공개. 끄면 수강생에게 안 보임
  created_at timestamptz default now()
);
-- (이전 버전 스키마를 이미 실행했다면 아래가 컬럼/타입을 맞춰줌)
alter table public.challenges add column if not exists cohort int default 1;
alter table public.challenges alter column active set default false;   -- 기본 비공개
alter table public.challenges add column if not exists manual_slug text;
update public.challenges set cohort = 1 where cohort is null;
alter table public.challenges alter column open_at type timestamptz using open_at::timestamptz;
alter table public.challenges alter column due_at  type timestamptz using due_at::timestamptz;
create index if not exists challenges_due_idx on public.challenges (due_at);

-- 수강생의 과제 제출 (과제 1개당 1건)
create table if not exists public.challenge_submissions (
  id bigint generated always as identity primary key,
  challenge_id bigint references public.challenges on delete cascade,
  user_id uuid references auth.users on delete cascade,
  content text,                     -- 제출 메모/링크
  file_path text,                   -- 첨부 파일 (submissions 버킷)
  file_name text,
  status text default 'submitted',  -- 'submitted' | 'draft'
  review_status text default 'pending',  -- 'pending' | 'pass' | 'fail'
  review_reason text,
  score int,
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (challenge_id, user_id)
);

-- ---------- 2. 신규 가입 시 프로필 자동 생성 ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, phone, email)
  values (
    new.id,
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'phone',
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 3. 어드민 판별 함수 ----------
create or replace function public.is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- 3-1. 프로필 민감 컬럼 보호 (수강생 스스로 등급·권한 변경 금지) ----------
--  수강생이 본인 프로필을 수정하더라도 level/role/status/cohort 는 어드민만 바꿀 수 있게 되돌린다.
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
  end if;
  return new;
end;
$$;
drop trigger if exists trg_protect_profile on public.profiles;
create trigger trg_protect_profile
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ---------- 3-2. 기수 생성 시 숙제 자동 복사 (비공개 상태) ----------
--  가장 낮은 기수(1기 등)의 숙제를 새 기수로 복제한다. 복제본은 비공개(active=false).
create or replace function public.seed_cohort_homework()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare tmpl int;
begin
  select min(cohort) into tmpl from public.challenges;
  if tmpl is not null and tmpl <> new.id then
    insert into public.challenges (title, description, manual_slug, cohort, due_at, active)
    select title, description, manual_slug, new.id, due_at, false
    from public.challenges where cohort = tmpl;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_seed_cohort_homework on public.cohorts;
create trigger trg_seed_cohort_homework
  after insert on public.cohorts
  for each row execute function public.seed_cohort_homework();

-- ---------- 4. RLS (행 수준 보안) ----------
alter table public.profiles    enable row level security;
alter table public.stores      enable row level security;
alter table public.submissions enable row level security;
alter table public.products    enable row level security;
alter table public.topics      enable row level security;
alter table public.practice_settings enable row level security;
alter table public.challenges  enable row level security;
alter table public.challenge_submissions enable row level security;
alter table public.cohorts     enable row level security;
alter table public.level_requests enable row level security;
alter table public.manual_chapters enable row level security;
alter table public.cohort_manual enable row level security;

-- 프로필: 본인 또는 어드민만 조회, 본인만 수정
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select
  using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update
  using (id = auth.uid() or public.is_admin());   -- 어드민은 승인 등 타인 프로필 수정 가능

-- 스토어: 본인 소유만 읽고/쓰고, 어드민은 조회 가능
drop policy if exists "stores_select" on public.stores;
create policy "stores_select" on public.stores for select
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "stores_insert" on public.stores;
create policy "stores_insert" on public.stores for insert
  with check (user_id = auth.uid());
drop policy if exists "stores_update" on public.stores;
create policy "stores_update" on public.stores for update
  using (user_id = auth.uid());
drop policy if exists "stores_delete" on public.stores;
create policy "stores_delete" on public.stores for delete
  using (user_id = auth.uid());

-- 자료 제출: 본인 소유만 쓰기, 조회는 본인/어드민
drop policy if exists "submissions_select" on public.submissions;
create policy "submissions_select" on public.submissions for select
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "submissions_insert" on public.submissions;
create policy "submissions_insert" on public.submissions for insert
  with check (user_id = auth.uid());
drop policy if exists "submissions_update" on public.submissions;
create policy "submissions_update" on public.submissions for update
  using (user_id = auth.uid() or public.is_admin());   -- 어드민 검수(통과/미통과) 가능
drop policy if exists "submissions_delete" on public.submissions;
create policy "submissions_delete" on public.submissions for delete
  using (user_id = auth.uid());

-- 상품: 로그인한 사람은 누구나 조회, 등록/수정/삭제는 어드민만
drop policy if exists "products_select" on public.products;
create policy "products_select" on public.products for select
  to authenticated using (true);
drop policy if exists "products_write" on public.products;
create policy "products_write" on public.products for all
  using (public.is_admin()) with check (public.is_admin());

-- 주제: 로그인한 사람은 누구나 조회, 등록/삭제는 어드민만
drop policy if exists "topics_select" on public.topics;
create policy "topics_select" on public.topics for select
  to authenticated using (true);
drop policy if exists "topics_write" on public.topics;
create policy "topics_write" on public.topics for all
  using (public.is_admin()) with check (public.is_admin());

-- 기수: 어드민은 전체 조회/수정, 수강생은 "자기 기수" 한 줄만 조회 (다른 기수 비노출)
drop policy if exists "cohorts_select" on public.cohorts;
create policy "cohorts_select" on public.cohorts for select
  using (public.is_admin()
         or id = (select cohort from public.profiles where id = auth.uid()));
drop policy if exists "cohorts_write" on public.cohorts;
create policy "cohorts_write" on public.cohorts for all
  using (public.is_admin()) with check (public.is_admin());

-- 등급업 신청: 본인 것만 신청/조회, 승인·반려(수정)는 어드민만
drop policy if exists "lr_select" on public.level_requests;
create policy "lr_select" on public.level_requests for select
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "lr_insert" on public.level_requests;
create policy "lr_insert" on public.level_requests for insert
  with check (user_id = auth.uid());
drop policy if exists "lr_update" on public.level_requests;
create policy "lr_update" on public.level_requests for update
  using (public.is_admin()) with check (public.is_admin());

-- 매뉴얼 챕터: 로그인한 사람은 조회(클라이언트가 숨김 판단), 수정은 어드민만
drop policy if exists "manual_chapters_select" on public.manual_chapters;
create policy "manual_chapters_select" on public.manual_chapters for select
  to authenticated using (true);
drop policy if exists "manual_chapters_write" on public.manual_chapters;
create policy "manual_chapters_write" on public.manual_chapters for all
  using (public.is_admin()) with check (public.is_admin());

-- 기수별 매뉴얼 공개: 로그인한 사람은 조회(클라가 자기 기수만 사용), 수정은 어드민만
drop policy if exists "cohort_manual_select" on public.cohort_manual;
create policy "cohort_manual_select" on public.cohort_manual for select
  to authenticated using (true);
drop policy if exists "cohort_manual_write" on public.cohort_manual;
create policy "cohort_manual_write" on public.cohort_manual for all
  using (public.is_admin()) with check (public.is_admin());

-- 챌린지 과제: 로그인한 사람은 조회, 등록/수정/삭제는 어드민만
drop policy if exists "challenges_select" on public.challenges;
create policy "challenges_select" on public.challenges for select
  to authenticated using (true);
drop policy if exists "challenges_write" on public.challenges;
create policy "challenges_write" on public.challenges for all
  using (public.is_admin()) with check (public.is_admin());

-- 챌린지 제출: 본인 것만 쓰기, 조회는 본인/어드민, 검수는 어드민
drop policy if exists "chsub_select" on public.challenge_submissions;
create policy "chsub_select" on public.challenge_submissions for select
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "chsub_insert" on public.challenge_submissions;
create policy "chsub_insert" on public.challenge_submissions for insert
  with check (user_id = auth.uid());
drop policy if exists "chsub_update" on public.challenge_submissions;
create policy "chsub_update" on public.challenge_submissions for update
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "chsub_delete" on public.challenge_submissions;
create policy "chsub_delete" on public.challenge_submissions for delete
  using (user_id = auth.uid());

-- 연습 세팅: 본인 것만 읽고 쓰기 (어드민은 결과 확인용으로 조회 가능)
drop policy if exists "practice_settings_select" on public.practice_settings;
create policy "practice_settings_select" on public.practice_settings for select
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "practice_settings_write" on public.practice_settings;
create policy "practice_settings_write" on public.practice_settings for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- 5. Storage 버킷 + 정책 ----------
insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', false)
on conflict (id) do nothing;

-- 파일 경로 규칙: {user_id}/{item}/{filename}  → 첫 폴더가 본인 uid 여야 함
drop policy if exists "sub_files_insert" on storage.objects;
create policy "sub_files_insert" on storage.objects for insert
  with check (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "sub_files_select" on storage.objects;
create policy "sub_files_select" on storage.objects for select
  using (bucket_id = 'submissions'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
drop policy if exists "sub_files_delete" on storage.objects;
create policy "sub_files_delete" on storage.objects for delete
  using (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text);

-- =========================================================
--  실행 후 할 일:
--  1) 나를 어드민으로 지정 (이메일은 본인 것으로 교체)
--     update public.profiles set role = 'admin', status = 'approved'
--     where email = 'spharmy@adaddition.co.kr';
--  2) (테스트 편의) 이메일 인증 끄기:
--     Authentication > Providers > Email > "Confirm email" 끄기
-- =========================================================
