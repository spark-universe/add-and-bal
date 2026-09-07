-- ============================================================
-- 수강생 캘린더용: 내 기수의 숙제 '일정'만 반환 (공개 전 숙제도 포함)
--  · 제목·공개일·마감일만 노출 (설명·자료 경로는 노출 안 함 → 내용은 공개 전까지 계속 숨김)
--  · challenges_select(RLS)은 공개 전 숙제를 막지만, 이 함수는 SECURITY DEFINER 로
--    안전한 컬럼만 골라 돌려준다. 캘린더에 예정 숙제를 미리 보여주는 용도.
--  Supabase SQL Editor 에서 실행.
-- ============================================================
create or replace function public.my_homework_schedule()
returns table (id bigint, title text, open_at timestamptz, due_at timestamptz)
language sql
security definer set search_path = public
stable
as $$
  select c.id, c.title, c.open_at, c.due_at
  from public.challenges c
  where c.active = true
    and c.cohort = coalesce((select cohort from public.profiles where id = auth.uid()), 1)
  order by c.open_at nulls first, c.due_at;
$$;
grant execute on function public.my_homework_schedule() to authenticated;
