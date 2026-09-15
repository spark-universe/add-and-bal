-- ============================================================
-- 1기 일정(매뉴얼 공개 + 숙제 open/due)을 2·3기로 복제
--  · 이동량 = 각 기수 수강일(enroll_date) − 1기 수강일 (예: 9/16 − 9/9 = +7일)
--    → 7일 단위면 요일도 그대로 유지됩니다 (수요일 시작 → 수요일 시작).
--  · 2·3기의 기존 숙제/공개일정은 지우고 1기 것으로 다시 만듭니다.
--  전제: 기수 관리에서 1기·2기·3기의 '수강일'이 올바로 저장돼 있어야 함.
--  Supabase → SQL Editor 에 붙여넣고 실행.
-- ============================================================

-- 0) 안전 확인 — 2·3기 숙제에 이미 제출물이 있는지 (있으면 삭제되니 먼저 상의)
select c.cohort, count(s.id) as submissions
from public.challenges c
left join public.challenge_submissions s on s.challenge_id = c.id
where c.cohort in (2, 3)
group by c.cohort;

-- 1) 복제 실행 (위 제출물이 0일 때 진행 권장)
do $$
declare
  base date := (select nullif(enroll_date, '')::date from public.cohorts where id = 1);
  t record;
  shift interval;
begin
  if base is null then
    raise exception '1기(수강일)이 설정돼 있어야 합니다. 기수 관리에서 1기 수강일을 먼저 입력하세요.';
  end if;

  for t in select id, nullif(enroll_date, '')::date as ed from public.cohorts where id in (2, 3) loop
    if t.ed is null then
      raise notice '기수 % 수강일이 없어 건너뜁니다.', t.id;
      continue;
    end if;
    shift := ((t.ed - base) || ' days')::interval;

    -- (a) 매뉴얼 공개 일정 복제
    delete from public.cohort_manual where cohort = t.id;
    insert into public.cohort_manual (cohort, slug, status, publish_at, updated_at)
    select t.id, slug, status,
           case when publish_at is null then null else publish_at + shift end, now()
    from public.cohort_manual where cohort = 1;

    -- (b) 숙제 복제 (open_at·due_at 이동, 나머지는 1기와 동일)
    delete from public.challenges where cohort = t.id;
    insert into public.challenges
      (title, description, manual_slug, cohort, open_at, due_at, active, material_url, material_path, material_name, created_at)
    select title, description, manual_slug, t.id,
           case when open_at is null then null else open_at + shift end,
           case when due_at  is null then null else due_at  + shift end,
           active, material_url, material_path, material_name, now()
    from public.challenges where cohort = 1;

    raise notice '기수 % 완료 (이동: %).', t.id, shift;
  end loop;
end $$;

-- 2) 확인 — 기수별 숙제 개수·일정
select cohort, count(*) as 숙제수, min(open_at) as 첫공개, max(due_at) as 마지막마감
from public.challenges where cohort in (1,2,3) group by cohort order by cohort;
