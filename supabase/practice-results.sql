-- ============================================================
-- 발주 연습 정산 결과 저장 (practice_results)
--  · 지금까지 정산 결과(등급·손익)는 수강생 브라우저(localStorage)에만 있어 기기를 바꾸면 사라지고 코치가 볼 수 없었다.
--  · order-result.html 이 정산을 완성하는 시점에 한 행을 upsert 한다.
--    같은 시나리오(plan_sig = practice_plan.sig)를 다시 열면 새 행이 아니라 그 행이 갱신된다 → unique (user_id, plan_sig).
--    새 연습 세팅으로 다시 돌리면 sig 가 달라져 새 행(= 새 시도)이 쌓인다.
--  · detail 에는 settle() 결과 객체 전체(세부 지표)를 jsonb 로 보관 — 화면 컬럼을 늘려도 다시 정산할 필요 없음.
--  · RLS: 본인 insert/update, 조회는 본인 또는 어드민, 삭제는 어드민만(수강생이 기록을 지우지 못하게).
--  ※ 순서: 이 SQL 을 '먼저' 실행한 뒤 머지. (반대로 하면 테이블이 없어 정산 화면에 '결과 저장 실패'가 잠깐 뜸 — 화면 자체는 정상)
--  Supabase SQL Editor 에서 실행. 멱등.
-- ============================================================
create table if not exists public.practice_results (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users on delete cascade,
  plan_sig    text not null default 'none',   -- 시나리오 서명. 없던 옛 데이터는 'none'
  topic       text,                            -- 연습 세팅(주제·난이도·마진) 스냅샷
  level       text,
  margin      numeric(5,2),
  total       int,                             -- 예정 주문 수
  processed   int,                             -- 처리한 주문 수
  grade       text,                            -- S / A / B / C / D
  achieve     int,                             -- 최적 대비 달성률 (%)
  net         numeric(12,2),                   -- 영업 손익 (광고 전)
  ad_spend    numeric(12,2),                   -- 광고비
  final_net   numeric(12,2),                   -- 최종 손익 = net - ad_spend
  cb_count    int,                             -- 차지백 건수
  ad_count    int,                             -- 반영된 캠페인 수
  detail      jsonb,                           -- settle() 결과 전체
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, plan_sig)
);
create index if not exists practice_results_user_idx    on public.practice_results (user_id);
create index if not exists practice_results_updated_idx on public.practice_results (updated_at desc);

alter table public.practice_results enable row level security;

drop policy if exists "pres_select" on public.practice_results;
create policy "pres_select" on public.practice_results for select
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "pres_insert" on public.practice_results;
create policy "pres_insert" on public.practice_results for insert
  with check (user_id = auth.uid());
drop policy if exists "pres_update" on public.practice_results;
create policy "pres_update" on public.practice_results for update
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());
drop policy if exists "pres_delete" on public.practice_results;
create policy "pres_delete" on public.practice_results for delete
  using (public.is_admin());

-- 확인
select count(*) as 행수 from public.practice_results;
