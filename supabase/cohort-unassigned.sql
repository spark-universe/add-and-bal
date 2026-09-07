-- ============================================================
-- 신규가입/미승인자를 '미분류(cohort 0)'로 정리 (기수 1에 몰리지 않게)
--  · profiles.cohort 기본값 1 → 0  (신규 가입자는 미분류로 시작)
--  · 아직 승인 안 된 기존 사용자도 미분류(0)로 이동
--  · 승인 시 실제 기수가 배정되므로 승인된 학생은 건드리지 않음
--  · (효과) 승인 화면에서 미분류(0)면 기수 드롭다운이 '최신 기수'를 기본 선택
--  Supabase SQL Editor 에서 실행. 멱등(여러 번 실행해도 안전).
-- ============================================================
alter table public.profiles alter column cohort set default 0;
update public.profiles set cohort = 0 where status is distinct from 'approved';
