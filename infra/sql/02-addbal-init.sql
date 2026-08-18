-- =====================================================================
-- infra/sql/02-addbal-init.sql — addbal DB 초기화 (GoTrue/storage 기동 前)
--
-- 실행 (addbal DB 에 대해, postgres 로):
--   psql -v ON_ERROR_STOP=1 -d addbal -f 02-addbal-init.sql
--
-- 여기서 하는 일은 GoTrue/storage-api 가 자기 마이그레이션을 돌릴 수 있게
-- 밭을 갈아두는 것뿐이다. auth.users / storage.objects 같은 실제 테이블은
-- 그 컨테이너들이 직접 만든다.
--
-- auth.uid() 계열은 GoTrue 가 만들어주지 않는다 — Supabase 플랫폼이 얹는
-- 것이라 셀프호스팅에서는 우리가 만들어야 한다. setup.sql 의 RLS 정책 40개가
-- 전부 이 함수에 의존하므로 없으면 조용히 전부 거부된다.
-- =====================================================================
\set ON_ERROR_STOP on

BEGIN;

-- ── 1. 확장 (Supabase 관례대로 extensions 스키마에 격리) ──────────────
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto    WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
ALTER DATABASE addbal SET search_path TO "$user", public, extensions;

-- ── 2. GoTrue / storage-api 가 소유할 스키마 ─────────────────────────
CREATE SCHEMA IF NOT EXISTS auth    AUTHORIZATION supabase_auth_admin;
CREATE SCHEMA IF NOT EXISTS storage AUTHORIZATION supabase_storage_admin;

-- 각 서비스는 자기 스키마 안에서만 전권을 갖는다
GRANT ALL ON SCHEMA auth    TO supabase_auth_admin;
GRANT ALL ON SCHEMA storage TO supabase_storage_admin;

-- ── 3. PostgREST 가 쓰는 스키마 접근 ─────────────────────────────────
GRANT USAGE ON SCHEMA public     TO anon, authenticated, service_role, authenticator;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role,
                                    supabase_auth_admin, supabase_storage_admin;
-- RLS 정책이 auth.uid() 를 호출하려면 스키마 USAGE 가 필요하다.
-- (테이블 권한은 안 준다 — auth.users 를 직접 읽을 수는 없음)
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

-- auth.uid() 계열은 여기서 만들지 않는다.
-- GoTrue 의 00_init_auth_schema 마이그레이션이 auth.uid()/auth.role() 을
-- 직접 CREATE OR REPLACE 하는데, 우리가 먼저 만들어두면 소유자가 postgres 라
-- supabase_auth_admin 이 덮어쓰지 못하고 마이그레이션 전체가 실패한다.
--   fatal: must be owner of function uid (SQLSTATE 42501)
-- 그래서 GoTrue 가 먼저 만들게 두고, 03-auth-shim.sql 이 나중에 갈아끼운다.
-- (GoTrue 판은 구형 GUC 인 request.jwt.claim.sub 만 읽어서 PostgREST v13 과
--  안 맞는다. 그대로 두면 RLS 40개가 조용히 전부 거부된다.)

-- ── 4. 앞으로 postgres 가 public 에 만들 테이블의 기본 권한 ──────────
-- Supabase 와 동일한 모델: SQL 권한은 열어두고 실제 방어는 RLS 가 한다.
-- 그래서 03-addbal-grants.sql 의 "RLS 게이트"가 반드시 같이 돌아야 한다.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;

COMMIT;

SELECT 'addbal 초기화 완료 — auth/storage 스키마 + auth.uid() shim 준비됨' AS result;
