# =====================================================================
# infra/bootstrap.ps1 — addbal 백엔드 전체 구축 (0부터, 재실행 안전)
#
#   powershell -ExecutionPolicy Bypass -File infra\bootstrap.ps1
#
# 순서가 중요하다. SQL 을 한 번에 못 돌리는 이유:
#   02 까지는 GoTrue/storage 가 마이그레이션할 밭만 갈아둔다.
#   → 컨테이너를 띄워야 auth.users / storage.objects 가 생긴다.
#   → 그게 생긴 뒤에야 03(auth.uid 교체) / setup.sql(auth.users 참조) /
#     04(storage 권한) 가 돌 수 있다.
# 그래서 "SQL → 기동 → SQL" 로 두 토막이다.
# =====================================================================
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$repo = Split-Path $here -Parent
$PG   = 'spark-postgres'          # spark-center 가 띄운 Postgres 16 컨테이너

function Step($n, $msg) { Write-Host "`n[$n] $msg" -ForegroundColor Cyan }
function Psql([string]$db, [string]$sql) {
  docker exec -u postgres $PG psql -v ON_ERROR_STOP=1 -d $db -tAc $sql
  if ($LASTEXITCODE -ne 0) { throw "psql 실패: $sql" }
}
function PsqlFile([string]$db, [string]$file, [string[]]$vars) {
  $name = Split-Path $file -Leaf
  docker cp $file "${PG}:/tmp/$name" | Out-Null
  $a = @('exec', '-u', 'postgres', '-e', 'PGCLIENTENCODING=UTF8', $PG, 'psql', '-v', 'ON_ERROR_STOP=1', '-d', $db)
  foreach ($v in $vars) { $a += @('-v', $v) }
  $a += @('-f', "/tmp/$name")
  & docker @a
  if ($LASTEXITCODE -ne 0) { throw "$name 적용 실패" }
}

# ── 0. 시크릿 ────────────────────────────────────────────────────────
Step 0 '시크릿 확인/생성'
& powershell -ExecutionPolicy Bypass -File (Join-Path $here 'gen-secrets.ps1')
$cfg = @{}
Get-Content (Join-Path $here '.env') | Where-Object { $_ -match '^[A-Z_]+=' } |
  ForEach-Object { $kv = $_ -split '=', 2; $cfg[$kv[0]] = $kv[1] }

# ── 1. 클러스터 role + spark_center 격리 게이트 ──────────────────────
Step 1 'Supabase role 6종 + spark_center CONNECT 격리'
PsqlFile 'postgres' (Join-Path $here 'sql\01-cluster-roles.sql') @(
  "AUTHENTICATOR_PASSWORD=$($cfg.AUTHENTICATOR_PASSWORD)",
  "AUTH_ADMIN_PASSWORD=$($cfg.AUTH_ADMIN_PASSWORD)",
  "STORAGE_ADMIN_PASSWORD=$($cfg.STORAGE_ADMIN_PASSWORD)"
)

# ── 2. addbal DB ─────────────────────────────────────────────────────
Step 2 'addbal DB 생성 + 접속 권한'
# CREATE DATABASE 는 트랜잭션 밖에서만 되므로 SQL 파일이 아니라 여기서 처리한다
$exists = docker exec -u postgres $PG psql -tAc "select 1 from pg_database where datname='addbal'"
if (-not $exists) { Psql 'postgres' 'CREATE DATABASE addbal' | Out-Null; Write-Host '  addbal 생성됨' }
else { Write-Host '  addbal 이미 존재 — 건너뜀' }
Psql 'postgres' 'REVOKE CONNECT ON DATABASE addbal FROM PUBLIC' | Out-Null
Psql 'postgres' 'GRANT CONNECT ON DATABASE addbal TO authenticator, anon, authenticated, service_role, supabase_auth_admin, supabase_storage_admin' | Out-Null

Step 3 'addbal 초기화 (확장 / auth·storage 스키마 / 기본권한)'
PsqlFile 'addbal' (Join-Path $here 'sql\02-addbal-init.sql') @()

# ── 4. 서비스 기동 → GoTrue/storage 가 자기 스키마를 마이그레이션 ────
Step 4 '컨테이너 기동 (GoTrue·storage 가 자기 마이그레이션 수행)'
Push-Location $here
try { docker compose up -d } finally { Pop-Location }

Write-Host '  auth.users / storage.objects 생성 대기...'
$ready = $false
foreach ($i in 1..60) {
  Start-Sleep -Seconds 2
  $n = docker exec -u postgres $PG psql -d addbal -tAc @"
select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
where (n.nspname='auth' and c.relname='users') or (n.nspname='storage' and c.relname='objects')
"@
  if ("$n".Trim() -eq '2') { $ready = $true; break }
}
if (-not $ready) {
  Write-Host '  마이그레이션이 끝나지 않았습니다. 로그:' -ForegroundColor Red
  docker logs addbal-auth --tail 20
  docker logs addbal-storage --tail 20
  throw 'GoTrue/storage 마이그레이션 실패'
}
Write-Host '  OK'

# ── 5. 스키마 ────────────────────────────────────────────────────────
Step 5 'auth.uid() 교체 (GoTrue 원본은 구형 GUC 만 읽음)'
PsqlFile 'addbal' (Join-Path $here 'sql\03-auth-shim.sql') @()

Step 6 '앱 스키마 (supabase/setup.sql — 14 테이블 + RLS)'
PsqlFile 'addbal' (Join-Path $repo 'supabase\setup.sql') @()

Step 7 '권한 확정 + RLS 게이트 + 스키마 캐시 자동 리로드'
PsqlFile 'addbal' (Join-Path $here 'sql\04-grants-and-gate.sql') @()

# ── 8. PostgREST 캐시 ────────────────────────────────────────────────
Step 8 'PostgREST 스키마 캐시 리로드'
# 04 가 만든 이벤트 트리거는 "그 다음" DDL 부터 동작한다. 최초 1회는 직접.
# 재시작이 아니라 SIGUSR1 이어야 컨테이너 IP 가 유지된다 (nginx 가 정적 해석).
docker kill -s SIGUSR1 addbal-rest | Out-Null
Start-Sleep -Seconds 3

# ── 9. 확인 ──────────────────────────────────────────────────────────
Step 9 '기동 확인'
$health = curl.exe -s -o NUL -w '%{http_code}' http://127.0.0.1:8100/health
$rest   = curl.exe -s -o NUL -w '%{http_code}' -H "apikey: $($cfg.SERVICE_ROLE_KEY)" -H "Authorization: Bearer $($cfg.SERVICE_ROLE_KEY)" http://127.0.0.1:8100/rest/v1/cohorts
$auth   = curl.exe -s -o NUL -w '%{http_code}' -H "apikey: $($cfg.ANON_KEY)" http://127.0.0.1:8100/auth/v1/settings
Write-Host "  gateway=$health  rest=$rest  auth=$auth"
if ("$health$rest$auth" -ne '200200200') { throw "기동 확인 실패 (gateway=$health rest=$rest auth=$auth)" }

Write-Host "`n구축 완료." -ForegroundColor Green
Write-Host @"

다음 할 일
  1. 어드민 지정 (해당 이메일로 먼저 가입한 뒤)
       docker cp infra\sql\05-make-admin.sql spark-postgres:/tmp/
       docker exec -u postgres spark-postgres psql -d addbal ``
         -v ADMIN_EMAIL='본인이메일' -f /tmp/05-make-admin.sql
  2. Cloudflare 터널에 Public Hostname 추가 (infra/README.md 참고)
       challenge.sparkuniverse.kr -> http://addbal-gw:80
  3. SMTP 설정 (infra/.env) — 없으면 비밀번호 재설정이 동작하지 않는다
  4. 검증
       powershell -File infra\test-e2e.ps1
       node infra\test-client.mjs
"@ -ForegroundColor Gray
