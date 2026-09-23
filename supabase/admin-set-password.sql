-- ============================================================
-- 수강생 비밀번호를 SQL 로 직접 설정 (Vercel 서버 함수를 쓸 수 없을 때의 대안)
--  · Supabase Auth 는 비밀번호를 bcrypt 로 저장한다. 같은 방식(pgcrypto crypt + gen_salt('bf'))으로 만든 해시를
--    auth.users.encrypted_password 에 넣으면 그 비밀번호로 바로 로그인된다.
--  · 공식 지원 경로는 아니지만 널리 쓰이는 방법. 잘못되면 다시 실행하면 된다.
--  · 사용법: 아래 두 자리표시자만 바꿔서 SQL Editor 에서 실행.
--      '수강생@이메일'  → 대상 수강생의 로그인 이메일
--      '새비밀번호'     → 8자 이상 권장. 수강생에게 직접 전달
--  ※ 실제 비밀번호를 이 파일에 적어 저장소에 커밋하지 말 것. 편집기에서만 바꿔 쓰고 실행한다.
--  ※ 관리자 계정은 아래 guard 로 제외된다(실수 방지). 관리자 비번은 Supabase 대시보드(Authentication → Users)에서.
-- ============================================================

-- 1) 비밀번호 설정 (관리자 계정 제외)
update auth.users u
set encrypted_password = extensions.crypt('새비밀번호', extensions.gen_salt('bf', 10)),
    updated_at = now()
where u.email = '수강생@이메일'
  and not exists (select 1 from public.profiles p where p.id = u.id and p.role = 'admin');

-- 2) (선택) 이미 로그인돼 있는 기기까지 즉시 끊고 싶으면 — 다음 요청부터 재로그인 필요
-- update auth.refresh_tokens set revoked = true
-- where user_id = (select id::text from auth.users where email = '수강생@이메일') and revoked = false;

-- 3) 확인 — 한 행이 나오고 갱신시각이 방금이면 성공. 0행이면 이메일 오타이거나 관리자 계정.
select u.email, p.name as 이름, p.role as 권한, u.updated_at as 갱신시각
from auth.users u left join public.profiles p on p.id = u.id
where u.email = '수강생@이메일';
