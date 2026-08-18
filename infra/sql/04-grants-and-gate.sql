-- =====================================================================
-- infra/sql/04-grants-and-gate.sql — PostgREST 권한 확정 + RLS 게이트
--
-- 실행 (addbal DB 에 대해, postgres 로. setup.sql 을 돌릴 때마다 같이):
--   psql -v ON_ERROR_STOP=1 -d addbal -f 04-grants-and-gate.sql
--
-- ── 이 파일이 존재하는 이유 ──────────────────────────────────────────
-- Supabase 모델에서는 SQL 권한(GRANT)을 활짝 열어두고 실제 방어를 RLS 가
-- 전담한다. 즉 "RLS 를 안 켠 public 테이블 = 인터넷에 그대로 공개"다.
-- anon 은 challenge.sparkuniverse.kr 로 아무나 도달할 수 있는 role 이라
-- 테이블 하나 깜빡하는 순간 전량 유출이다.
--
-- 그래서 spark-center 의 09-ads.sql 이 쓰는 isolation gate 와 같은 방식으로,
-- public 스키마에 RLS 가 없거나 정책이 0개인 테이블이 하나라도 있으면
-- 여기서 예외를 던져 배포를 막는다. 새 테이블을 추가하면 이 파일을 다시 돌릴 것.
-- =====================================================================
\set ON_ERROR_STOP on

BEGIN;

-- ── 1. 이미 만들어진 테이블에 권한 확정 ──────────────────────────────
-- ALTER DEFAULT PRIVILEGES 는 "앞으로 만들 것"에만 걸린다. setup.sql 을
-- 02 보다 먼저 돌렸거나 손으로 만든 테이블이 있으면 여기서 메꿔진다.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, authenticator;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE                        ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- ── 1-0. storage 스키마 권한 ─────────────────────────────────────────
-- storage-api 는 supabase_storage_admin 으로 붙은 뒤 JWT 의 role 로 SET ROLE
-- 한다. 그 role 이 storage 스키마를 못 쓰면 업로드가 이렇게 죽는다:
--   permission denied for schema storage
-- 여기서도 실제 방어선은 setup.sql 이 storage.objects 에 건 RLS 정책
-- (경로 첫 폴더가 본인 uid) 이고, GRANT 는 열어둔다 — public 과 같은 모델.
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA storage TO anon, authenticated, service_role;
GRANT USAGE, SELECT                  ON ALL SEQUENCES IN SCHEMA storage TO anon, authenticated, service_role;
GRANT EXECUTE                        ON ALL FUNCTIONS IN SCHEMA storage TO anon, authenticated, service_role;
-- storage-api 를 업그레이드하면 테이블이 늘어난다. 그때 권한이 빠지지 않게.
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_storage_admin IN SCHEMA storage
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_storage_admin IN SCHEMA storage
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;

-- ── 1-1. PostgREST 스키마 캐시 자동 리로드 ───────────────────────────
-- PostgREST 는 기동 시 스키마를 캐시한다. setup.sql 로 테이블을 만들어도
-- 캐시를 안 깨우면 계속 이렇게 답한다:
--     PGRST205 Could not find the table 'public.profiles' in the schema cache
-- DB 는 멀쩡한데 앱만 404 라 원인 찾기가 고약하다. DDL 이 끝날 때마다
-- NOTIFY 로 깨워서 이 함정 자체를 없앤다. (이벤트 트리거는 DB 단위라
-- spark_center 에는 영향이 없다.)
CREATE OR REPLACE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
  LANGUAGE plpgsql AS $$
BEGIN
  NOTIFY pgrst, 'reload schema';
END $$;

CREATE OR REPLACE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
  LANGUAGE plpgsql AS $$
BEGIN
  NOTIFY pgrst, 'reload schema';
END $$;

DROP EVENT TRIGGER IF EXISTS pgrst_ddl_watch;
CREATE EVENT TRIGGER pgrst_ddl_watch  ON ddl_command_end
  EXECUTE FUNCTION extensions.pgrst_ddl_watch();
DROP EVENT TRIGGER IF EXISTS pgrst_drop_watch;
CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
  EXECUTE FUNCTION extensions.pgrst_drop_watch();

COMMIT;

-- ── 2. RLS 게이트 ────────────────────────────────────────────────────
DO $$
DECLARE bad text;
BEGIN
  -- 2-1. RLS 가 꺼진 테이블
  SELECT string_agg(tablename, ', ' ORDER BY tablename) INTO bad
  FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity;
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'RLS 게이트 실패 — RLS 가 꺼진 public 테이블(=전체 공개): %', bad;
  END IF;

  -- 2-2. RLS 는 켰지만 정책이 0개인 테이블 (전부 거부라 조용히 앱이 깨진다)
  SELECT string_agg(t.tablename, ', ' ORDER BY t.tablename) INTO bad
  FROM pg_tables t
  WHERE t.schemaname = 'public'
    AND NOT EXISTS (SELECT 1 FROM pg_policies p
                    WHERE p.schemaname = 'public' AND p.tablename = t.tablename);
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'RLS 게이트 실패 — 정책이 0개인 테이블(전부 거부됨): %', bad;
  END IF;

  -- 2-3. auth.uid() 가 살아있는지 (03-auth-shim 이 빠지면 RLS 전멸)
  PERFORM set_config('request.jwt.claims',
                     '{"sub":"00000000-0000-0000-0000-000000000001"}', true);
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'RLS 게이트 실패 — auth.uid() 가 NULL. 03-auth-shim.sql 을 돌리세요';
  END IF;
END $$;

-- ── 3. 검증 출력 ─────────────────────────────────────────────────────
SELECT 'public 테이블 수: '   || count(*) FROM pg_tables WHERE schemaname = 'public';
SELECT 'RLS 정책 수: '        || count(*) FROM pg_policies WHERE schemaname = 'public';
SELECT 'anon 권한 있는 테이블: ' || count(DISTINCT table_name)
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public' AND grantee = 'anon';
SELECT 'submissions 버킷 존재: ' || exists(SELECT 1 FROM storage.buckets WHERE id = 'submissions');
SELECT 'RLS 게이트 통과' AS result;
