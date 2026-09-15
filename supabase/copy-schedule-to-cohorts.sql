-- ============================================================
-- 1기 일정(매뉴얼 공개 + 숙제 open/due)을 2·3기로 복제  [비파괴 버전]
--  · 이동량 = 각 기수 수강일(enroll_date) − 1기 수강일 (예: 9/16 − 9/9 = +7일)
--    → 7일 단위면 요일도 그대로 유지됩니다 (수요일 시작 → 수요일 시작).
--  · 기존 2·3기 숙제는 '삭제하지 않고' 날짜만 업데이트 → 제출물 보존.
--    (2·3기 숙제는 기수 생성 때 1기에서 복사됐으므로 '제목'으로 매칭합니다.)
--  · 1기에만 있는 숙제는 2·3기에 새로 추가.
--  전제: 기수 관리에서 1·2·3기 '수강일'이 올바로 저장돼 있어야 함.
--  Supabase → SQL Editor 에 붙여넣고 실행. 여러 번 실행해도 안전(멱등).
-- ============================================================
do $$
declare
  base date := (select nullif(enroll_date, '')::date from public.cohorts where id = 1);
  t record;
  src record;
  shift interval;
  mid bigint;
begin
  if base is null then
    raise exception '1기 수강일이 없습니다. 기수 관리에서 1기 수강일을 먼저 입력하세요.';
  end if;

  for t in select id, nullif(enroll_date, '')::date as ed from public.cohorts where id in (2, 3) loop
    if t.ed is null then
      raise notice '기수 % 수강일이 없어 건너뜁니다.', t.id;
      continue;
    end if;
    shift := ((t.ed - base) || ' days')::interval;

    -- (a) 매뉴얼 공개 일정: (cohort, slug) 기준 upsert (제출물과 무관하여 안전)
    insert into public.cohort_manual (cohort, slug, status, publish_at, updated_at)
    select t.id, slug, status,
           case when publish_at is null then null else publish_at + shift end, now()
    from public.cohort_manual where cohort = 1
    on conflict (cohort, slug) do update
      set status = excluded.status, publish_at = excluded.publish_at, updated_at = now();

    -- (b) 숙제: 제목으로 매칭 → 있으면 날짜만 업데이트(제출물 보존), 없으면 추가
    for src in select * from public.challenges where cohort = 1 loop
      select id into mid from public.challenges
      where cohort = t.id and title = src.title
      order by id limit 1;

      if mid is not null then
        update public.challenges set
          open_at       = case when src.open_at is null then null else src.open_at + shift end,
          due_at        = case when src.due_at  is null then null else src.due_at  + shift end,
          active        = src.active,
          description   = src.description,
          manual_slug   = src.manual_slug,
          material_url  = src.material_url,
          material_path = src.material_path,
          material_name = src.material_name
        where id = mid;
      else
        insert into public.challenges
          (title, description, manual_slug, cohort, open_at, due_at, active, material_url, material_path, material_name, created_at)
        values (src.title, src.description, src.manual_slug, t.id,
                case when src.open_at is null then null else src.open_at + shift end,
                case when src.due_at  is null then null else src.due_at  + shift end,
                src.active, src.material_url, src.material_path, src.material_name, now());
      end if;
    end loop;

    raise notice '기수 % 완료 (이동: %).', t.id, shift;
  end loop;
end $$;

-- 확인 — 기수별 숙제 수 · 첫 공개일 · 마지막 마감
select cohort, count(*) as 숙제수, min(open_at) as 첫공개, max(due_at) as 마지막마감
from public.challenges where cohort in (1, 2, 3) group by cohort order by cohort;
