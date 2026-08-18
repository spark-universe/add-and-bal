-- =====================================================================
-- infra/sql/05-make-admin.sql — 첫 어드민 지정
--
--   psql -v ON_ERROR_STOP=1 -v ADMIN_EMAIL='spharmy@adaddition.co.kr' \
--        -d addbal -f 05-make-admin.sql
--
-- ── 왜 별도 파일이 필요한가 ──────────────────────────────────────────
-- supabase/setup.sql 맨 아래의 안내는 이렇게 되어 있다:
--     update public.profiles set role='admin', status='approved' where email='...';
-- 그런데 이 명령은 실제로는 아무 일도 하지 않는다. setup.sql 이 같이 만든
-- protect_profile_fields BEFORE UPDATE 트리거가
--     if not public.is_admin() then new.role := old.role; ... end if;
-- 로 되돌리기 때문이다. SQL 에디터/psql 에서는 auth.uid() 가 NULL 이라
-- is_admin() 이 false 다. 즉 "어드민이 아니면 어드민을 만들 수 없다"는
-- 닭-달걀 상태이고, UPDATE 0 도 아니고 UPDATE 1 이 찍히면서 값만 안 바뀐다.
--
-- 그래서 트리거를 우회해야 하는데, ALTER TABLE ... DISABLE TRIGGER 는
-- ACCESS EXCLUSIVE 락을 잡고 스크립트가 중간에 죽으면 트리거가 꺼진 채로
-- 남는다. session_replication_role 은 세션 한정이라 끊기면 자동 복구된다.
-- =====================================================================
\set ON_ERROR_STOP on

BEGIN;

-- superuser 전용. 이 세션에서만 사용자 트리거를 건너뛴다.
SET LOCAL session_replication_role = replica;

UPDATE public.profiles
   SET role = 'admin', status = 'approved', level = 1
 WHERE email = :'ADMIN_EMAIL';

COMMIT;

-- 검증 — 값이 실제로 바뀌었는지 (트리거에 되돌려지지 않았는지) 확인
DO $$
DECLARE r record;
BEGIN
  SELECT role, status, level INTO r FROM public.profiles WHERE email = :'ADMIN_EMAIL';
  IF r IS NULL THEN
    RAISE EXCEPTION '% 계정이 없습니다 — 먼저 해당 이메일로 가입하세요', :'ADMIN_EMAIL';
  END IF;
  IF r.role <> 'admin' OR r.status <> 'approved' THEN
    RAISE EXCEPTION '어드민 지정 실패 (트리거가 되돌림): role=% status=%', r.role, r.status;
  END IF;
END $$;

SELECT '어드민 지정 완료: ' || :'ADMIN_EMAIL' AS result;
