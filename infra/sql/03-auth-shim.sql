-- =====================================================================
-- infra/sql/03-auth-shim.sql — auth.uid() 계열 교체 (GoTrue 마이그레이션 後)
--
-- 실행 (addbal DB 에 대해, postgres 로 — 반드시 addbal-auth 가 한 번
-- 정상 기동해서 auth 스키마 마이그레이션을 끝낸 뒤에):
--   psql -v ON_ERROR_STOP=1 -d addbal -f 03-auth-shim.sql
--
-- ── 왜 갈아끼우나 ────────────────────────────────────────────────────
-- GoTrue 가 심는 원본은 이렇게 생겼다:
--     select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
-- 이건 PostgREST 구버전이 클레임을 GUC 로 낱개(request.jwt.claim.<name>)로
-- 심던 시절의 것이다. PostgREST v13 은 기본적으로 JSON 한 덩어리
-- (request.jwt.claims)로 심는다. 그래서 원본을 그대로 두면 auth.uid() 가
-- 항상 NULL 이고, setup.sql 의 RLS 정책 40개가 전부 "조용히 거부"된다.
-- 에러도 안 나고 그냥 빈 결과가 나와서 제일 찾기 어려운 형태로 터진다.
--
-- 아래 판은 두 방식을 모두 읽는다. PGRST_DB_USE_LEGACY_GUCS 를 나중에
-- 뒤집어도, GoTrue 를 올려도 그대로 동작한다.
--
-- 소유자가 supabase_auth_admin 이라 CREATE OR REPLACE 는 superuser(postgres)
-- 로만 통과한다. GoTrue 를 메이저 업그레이드하면 이 파일을 다시 돌릴 것.
-- =====================================================================
\set ON_ERROR_STOP on

BEGIN;

-- auth 스키마 마이그레이션이 실제로 끝났는지 먼저 확인 (안 끝났으면 여기서 정지)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'auth' AND c.relname = 'users'
  ) THEN
    RAISE EXCEPTION 'auth.users 가 없습니다 — addbal-auth 를 먼저 정상 기동시키세요';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
  LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb)
$$;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
  LANGUAGE sql STABLE AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),   -- 구형 GUC
    auth.jwt() ->> 'sub'                                          -- v13 기본
  )::uuid
$$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text
  LANGUAGE sql STABLE AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    auth.jwt() ->> 'role'
  )
$$;

CREATE OR REPLACE FUNCTION auth.email() RETURNS text
  LANGUAGE sql STABLE AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    auth.jwt() ->> 'email'
  )
$$;

GRANT EXECUTE ON FUNCTION auth.jwt(), auth.uid(), auth.role(), auth.email()
  TO anon, authenticated, service_role, supabase_auth_admin, supabase_storage_admin;

COMMIT;

-- 검증: JSON GUC 를 심어놓고 uid() 가 그 값을 실제로 읽어내는지 확인한다.
-- 여기서 f 가 나오면 RLS 가 전부 죽는다는 뜻이므로 그냥 실패시킨다.
DO $$
DECLARE got uuid;
BEGIN
  PERFORM set_config('request.jwt.claims',
                     '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
  SELECT auth.uid() INTO got;
  IF got IS DISTINCT FROM '00000000-0000-0000-0000-000000000001'::uuid THEN
    RAISE EXCEPTION 'auth.uid() 가 JSON GUC 를 못 읽습니다 (got=%) — RLS 전멸 상태', got;
  END IF;
  IF auth.role() <> 'authenticated' THEN
    RAISE EXCEPTION 'auth.role() 불일치: %', auth.role();
  END IF;
END $$;

SELECT 'auth.uid()/role() 교체 완료 — JSON GUC 읽기 검증 통과' AS result;
