-- =========================================================
--  보안 보완: 학생이 '검수 결과'를 스스로 통과/점수 조작하지 못하게
--  (RLS update 정책이 본인 행 수정을 허용하므로, 검수 필드는 트리거로 보호)
--  학생의 정상 동작(재제출 시 review_status='pending' 리셋)은 그대로 허용.
--  Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하세요.
-- =========================================================

-- 1) 자료 제출(submissions)
create or replace function public.protect_submission_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin()
     and new.review_status is distinct from old.review_status
     and new.review_status in ('pass','fail') then
    -- 학생이 자기 제출을 통과/미통과로 조작 → 검수 필드 원복
    new.review_status := old.review_status;
    new.review_reason := old.review_reason;
    new.reviewed_at   := old.reviewed_at;
  end if;
  return new;
end; $$;
drop trigger if exists trg_protect_submission on public.submissions;
create trigger trg_protect_submission before update on public.submissions
  for each row execute function public.protect_submission_review();

-- 2) 챌린지(숙제) 제출(challenge_submissions) — 점수(score)도 보호
create or replace function public.protect_chsub_review()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    if new.review_status is distinct from old.review_status
       and new.review_status in ('pass','fail') then
      new.review_status := old.review_status;
      new.review_reason := old.review_reason;
      new.reviewed_at   := old.reviewed_at;
    end if;
    -- 학생은 점수를 넣을 수 없음(재제출 시 null 리셋만 허용)
    if new.score is distinct from old.score and new.score is not null then
      new.score := old.score;
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_protect_chsub on public.challenge_submissions;
create trigger trg_protect_chsub before update on public.challenge_submissions
  for each row execute function public.protect_chsub_review();
