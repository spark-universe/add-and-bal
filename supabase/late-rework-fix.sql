-- ============================================================
-- 지각 판정 보정 — 미통과 뒤 '재작업 기한 안'의 재제출은 원래 제출 일시를 유지
--  문제: submitted_at 트리거가 수강생의 모든 재제출에 now() 를 찍어서, 마감 안에 낸 숙제가 미통과를 받고
--        (검수일 + 3일 23:59 까지 허용되는) 재작업으로 다시 제출 확정하면 마감 뒤라서 '지각'으로 바뀌었다.
--  수정: 직전 상태가 미통과(review_status='fail')이고 재작업 기한(검수일 + 3일, 그날 23:59 KST) 안이면
--        old.submitted_at 을 그대로 둔다. 기한이 지난 재제출은 전처럼 새로 찍는다(= 지각).
--        원래 지각이었던 제출은 재작업해도 그대로 지각이다.
--  late-submissions.sql 의 같은 함수도 이 정의로 맞춰 두었다. Supabase SQL Editor 에서 실행. 멱등.
-- ============================================================
create or replace function public.set_chsub_submitted_at()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  rework_until timestamptz;
begin
  -- '인증된 수강생(비어드민)'의 저장만 제출로 본다.
  -- auth.uid() 가 없는 맥락(SQL 편집기·서비스 롤·마이그레이션)과 어드민은 문장이 준 값을 그대로 둔다.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.submitted_at := case when new.status is distinct from 'draft' then now() else null end;
    new.late_waived  := false;
  else
    -- 미통과 뒤 재작업 기한(검수일 + 3일, 그날 23:59 KST) 안의 재제출은 담당자가 허용한 수정 → 원래 제출 일시 유지
    if old.review_status = 'fail' and old.reviewed_at is not null and old.submitted_at is not null then
      rework_until := (((old.reviewed_at at time zone 'Asia/Seoul')::date + 4)::timestamp) at time zone 'Asia/Seoul';
    end if;
    if new.status is distinct from 'draft' then
      if rework_until is not null and now() < rework_until then new.submitted_at := old.submitted_at;
      else new.submitted_at := now(); end if;
    else
      new.submitted_at := old.submitted_at;
    end if;
    new.late_waived := old.late_waived;
  end if;
  return new;
end $$;

-- 확인 — 함수 본문에 재작업 규칙이 들어갔으면 true
select (pg_get_functiondef('public.set_chsub_submitted_at'::regproc) like '%rework_until%') as 재작업규칙적용;
