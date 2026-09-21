-- ============================================================
-- 지각 표시 오탐 정리 — "배포 전 제출이 지각으로 보이는" 문제
--  원인: late-submissions.sql v1 이 기존 제출의 submitted_at 을 created_at 으로 백필했는데,
--        제출 당시 마감이 없었거나(불러온 숙제는 마감 없이 시작) 마감일이 나중에 설정된 숙제에서
--        그 값이 마감보다 뒤라 '지각'으로 잡혔다. 옛 규칙상 배포 전 제출은 지각일 수 없다.
--  기준: 지각 기능은 2026-09-21 16:58 (KST) 에 배포됐다. 그 이전 시각의 submitted_at 은 전부 백필값이고,
--        실제 서버 스탬프(수강생이 확정한 시각)는 그 이후에만 존재한다.
--  ① 을 먼저 단독 실행해 결과를 확인하고, ② 를 실행한다. ② 는 백필값만 비우므로 실제 지각(배포 후)은 그대로 남는다.
-- ============================================================

-- ① 진단 — 지각으로 표시되는 제출을 원인별로 센다 (이것만 먼저 실행)
with x as (
  select s.id, s.user_id, s.created_at, s.submitted_at, s.reviewed_at, c.title, c.cohort, c.due_at,
         case
           when s.submitted_at is null or c.due_at is null or s.submitted_at <= c.due_at then '지각 아님'
           when s.submitted_at < timestamptz '2026-09-21 16:58:00+09' then '배포 전 제출(백필값) → 오탐'
           when s.submitted_at > s.created_at + interval '1 minute' then '배포 후 재제출 → 실제 지각(제출 일시 기준)'
           else '배포 후 첫 제출 → 실제 지각'
         end as 사유
  from public.challenge_submissions s
  join public.challenges c on c.id = s.challenge_id
  where s.status is distinct from 'draft'
)
select 사유, count(*) as 건수 from x group by 사유 order by 건수 desc;

-- (선택) 오탐 상세 — 어떤 수강생·숙제가 잘못 잡혔는지. 마감일이 제출보다 앞인데 제출은 배포 전인 것들.
select p.name as 수강생, c.cohort as 기수, c.title as 숙제,
       c.due_at as 마감, s.submitted_at as 백필된_제출시각, s.created_at as 행_생성
from public.challenge_submissions s
join public.challenges c on c.id = s.challenge_id
left join public.profiles p on p.id = s.user_id
where s.status is distinct from 'draft'
  and s.submitted_at is not null and c.due_at is not null
  and s.submitted_at > c.due_at
  and s.submitted_at < timestamptz '2026-09-21 16:58:00+09'
order by c.cohort, c.title, p.name;

-- ② 정리 — 배포 전(백필) 값만 비운다. 배포 후 실제 제출 시각은 그대로. 멱등.
update public.challenge_submissions
set submitted_at = null
where submitted_at is not null
  and submitted_at < timestamptz '2026-09-21 16:58:00+09';

-- 확인 — 남은 지각 = 배포 후 실제 지각만이어야 한다
select count(*) as 남은_지각_건수
from public.challenge_submissions s
join public.challenges c on c.id = s.challenge_id
where s.status is distinct from 'draft'
  and s.submitted_at is not null and c.due_at is not null
  and s.submitted_at > c.due_at;
