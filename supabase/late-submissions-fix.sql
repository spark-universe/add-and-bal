-- ============================================================
-- 지각 표시 오탐 정리 (v2) — "102건이 한꺼번에 지각으로 보이는" 문제
--  원인: 트리거가 '어드민이 아니면 수강생'으로 판단했는데, SQL 편집기에서는 로그인 사용자가 없어(auth.uid() = NULL)
--        is_admin() 이 false → 백필 UPDATE 자체가 '수강생의 재제출'로 취급돼 모든 확정 행의 submitted_at 이
--        그 SQL 을 실행한 시각(now())으로 한꺼번에 덮였다. 그래서 전부 "배포 후 지각"으로 분류됐다.
--  이 파일 하나로 끝난다 (순서가 중요해서 한 파일에 담음):
--   ① 트리거 교체 — 인증된 수강생일 때만 시각을 찍고, SQL 편집기·서비스 롤·어드민은 문장이 준 값을 그대로 둔다
--   ② 진단 — 같은 시각을 여러 행이 공유하면 일괄 스탬프(사람은 같은 마이크로초에 제출할 수 없음)
--   ③ 정리 — 그 일괄 스탬프만 NULL 로. 수강생이 실제로 확정한 시각(행마다 다름)은 그대로
--   ④ 확인
--  ※ 옛 트리거가 남아 있으면 ③ 의 NULL 이 다시 now() 로 덮이므로 반드시 ① 이 먼저 — 그래서 한 파일. 멱등.
-- ============================================================

-- ① 트리거 교체 (late-submissions.sql 의 정의와 동일)
create or replace function public.set_chsub_submitted_at()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.submitted_at := case when new.status is distinct from 'draft' then now() else null end;
    new.late_waived  := false;
  else
    if new.status is distinct from 'draft' then new.submitted_at := now();
    else new.submitted_at := old.submitted_at; end if;
    new.late_waived := old.late_waived;
  end if;
  return new;
end $$;
drop trigger if exists trg_chsub_submitted_at on public.challenge_submissions;
create trigger trg_chsub_submitted_at
  before insert or update on public.challenge_submissions
  for each row execute function public.set_chsub_submitted_at();

-- ② 진단 — 일괄 스탬프 찾기: 같은 submitted_at 을 공유하는 행 수 (실제 제출은 행마다 시각이 다르다)
select submitted_at as 공유된_시각, count(*) as 행수
from public.challenge_submissions
where submitted_at is not null
group by submitted_at
having count(*) >= 3
order by count(*) desc;

-- ③ 정리 — 3행 이상이 공유하는 시각(=일괄 스탬프)만 NULL 로. 트리거가 ① 로 바뀌어 NULL 이 그대로 남는다.
update public.challenge_submissions
set submitted_at = null
where submitted_at in (
  select submitted_at from public.challenge_submissions
  where submitted_at is not null
  group by submitted_at having count(*) >= 3
);

-- ④ 확인 — 남은 지각(=배포 후 수강생이 실제로 늦게 확정한 것)과 남은 일괄 스탬프(0 이어야 함)
select
  (select count(*) from public.challenge_submissions s join public.challenges c on c.id = s.challenge_id
     where s.status is distinct from 'draft' and s.submitted_at is not null and c.due_at is not null and s.submitted_at > c.due_at) as 남은_지각,
  (select count(*) from (select submitted_at from public.challenge_submissions where submitted_at is not null
     group by submitted_at having count(*) >= 3) t) as 남은_일괄스탬프_그룹;
