-- =====================================================================
-- infra/sql/01-cluster-roles.sql — Supabase role 6종 + spark_center 격리 게이트
--
-- 실행 (postgres DB 에 대해, postgres 로):
--   psql -v ON_ERROR_STOP=1 \
--        -v AUTHENTICATOR_PASSWORD='...' \
--        -v AUTH_ADMIN_PASSWORD='...' \
--        -v STORAGE_ADMIN_PASSWORD='...' \
--        -f 01-cluster-roles.sql
--
-- Postgres 의 role 은 DB 단위가 아니라 클러스터 단위다. addbal 을 기존
-- spark-postgres 에 얹는 대가로 anon/authenticated/service_role/authenticator
-- 가 클러스터 전역에 생긴다. authenticator 는 PostgREST 가 물고 있고 결국
-- 인터넷에서 도달 가능한 role 이므로, spark_center 로 새는 경로를 여기서 끊는다.
--
-- 끊는 방법: spark_center 는 지금 PUBLIC 에 CONNECT 가 열려 있고(=Tc/postgres)
-- 기존 spark_* role 들이 바로 그 PUBLIC 권한에 얹혀 붙고 있다. 그래서 순서가
-- 중요하다 — 먼저 기존 role 에 CONNECT 를 명시적으로 주고, 그 다음에 PUBLIC 을
-- 회수한다. 순서를 뒤집으면 spark-center 가 즉시 죽는다.
-- =====================================================================
\set ON_ERROR_STOP on

BEGIN;

-- ── 1. JWT role 클레임이 SET ROLE 되는 대상 (로그인 불가) ─────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  -- service_role 만 RLS 를 우회한다. 이관 스크립트/서버 전용이며 브라우저에
  -- 절대 내려가면 안 되는 키다.
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
END $$;

-- ── 2. 실제 접속 role 3종 ────────────────────────────────────────────
-- 비밀번호는 CREATE 와 분리해서 ALTER 로 건다: 이미 존재하든 아니든 같은 결과.
DO $$
BEGIN
  -- PostgREST 전용. NOINHERIT 라서 스스로는 아무 권한이 없고, JWT 의 role 로
  -- SET ROLE 했을 때만 그 role 의 권한을 얻는다.
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator LOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    CREATE ROLE supabase_auth_admin LOGIN NOINHERIT CREATEROLE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_storage_admin') THEN
    CREATE ROLE supabase_storage_admin LOGIN NOINHERIT CREATEROLE;
  END IF;
END $$;

ALTER ROLE authenticator          PASSWORD :'AUTHENTICATOR_PASSWORD';
ALTER ROLE supabase_auth_admin    PASSWORD :'AUTH_ADMIN_PASSWORD';
ALTER ROLE supabase_storage_admin PASSWORD :'STORAGE_ADMIN_PASSWORD';

-- PostgREST 는 요청마다 JWT 의 role 로 SET ROLE 한다
GRANT anon, authenticated, service_role TO authenticator;
-- storage-api 도 똑같이 SET ROLE 을 한다. 이게 빠지면 업로드가 이렇게 죽는다:
--   permission denied to set role "service_role"
-- (DB_INSTALL_ROLES=false 로 뒀으므로 storage 가 스스로 만들지 않는다)
GRANT anon, authenticated, service_role TO supabase_storage_admin;

COMMIT;

-- ── 3. spark_center 격리 게이트 ──────────────────────────────────────
-- 먼저 명시적 CONNECT (기존 role 은 지금 PUBLIC 에 얹혀 있다)
BEGIN;
GRANT CONNECT ON DATABASE spark_center
  TO spark_app, spark_worker, spark_ingest, spark_admin, campaign;
-- 그 다음에 회수 — 이제 새로 생긴 addbal role 들은 spark_center 에 못 붙는다
REVOKE CONNECT ON DATABASE spark_center FROM PUBLIC;
COMMIT;

-- ── 4. 검증 (t 여야 하는 것 / f 여야 하는 것) ────────────────────────
DO $$
DECLARE bad text;
BEGIN
  -- 4-1. 기존 spark-center 접속 role 이 전부 살아있어야 한다
  SELECT string_agg(r, ', ') INTO bad FROM unnest(ARRAY[
    'spark_app_rw','spark_worker_rw','spark_ingest_rw','spark_admin_rw','campaign'
  ]) AS r
  WHERE NOT has_database_privilege(r, 'spark_center', 'CONNECT');
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION '격리 게이트 실패 — 기존 role 이 spark_center 에 못 붙습니다: %', bad;
  END IF;

  -- 4-2. addbal role 은 단 하나도 spark_center 에 붙으면 안 된다
  SELECT string_agg(r, ', ') INTO bad FROM unnest(ARRAY[
    'anon','authenticated','service_role','authenticator',
    'supabase_auth_admin','supabase_storage_admin'
  ]) AS r
  WHERE has_database_privilege(r, 'spark_center', 'CONNECT');
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION '격리 게이트 실패 — addbal role 이 spark_center 에 붙습니다: %', bad;
  END IF;
END $$;

SELECT '격리 게이트 통과: 기존 role 5종 CONNECT 유지 + addbal role 6종 차단' AS result;
