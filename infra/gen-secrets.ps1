# =====================================================================
# infra/gen-secrets.ps1 — addbal 셀프호스팅 스택 시크릿 생성 (1회 실행)
#
#   powershell -ExecutionPolicy Bypass -File infra\gen-secrets.ps1
#
# 출력: infra/.env  (gitignore 대상. 절대 커밋 금지)
#   - JWT_SECRET          GoTrue 가 서명 / PostgREST·storage-api 가 검증
#   - ANON_KEY            브라우저에 공개되는 키 (RLS 가 실제 방어선)
#   - SERVICE_ROLE_KEY    RLS 우회. 서버/이관 스크립트 전용, 프론트에 절대 금지
#   - *_PASSWORD          Postgres 로그인 role 3종
#
# 이미 .env 가 있으면 덮어쓰지 않는다 (키가 바뀌면 기존 세션·토큰이 전부 죽음).
# =====================================================================
$ErrorActionPreference = 'Stop'
$envPath = Join-Path $PSScriptRoot '.env'

if (Test-Path $envPath) {
  Write-Host "infra/.env 가 이미 있습니다. 덮어쓰지 않고 종료합니다." -ForegroundColor Yellow
  Write-Host "재생성하려면 기존 파일을 먼저 옮기세요 (기존 로그인 세션은 전부 무효화됩니다)."
  exit 0
}

$rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
function New-Secret([int]$bytes) {
  $b = New-Object byte[] $bytes
  $rng.GetBytes($b)
  # base64url — .env / DSN / URL 어디에 들어가도 이스케이프가 필요 없는 문자만 남긴다
  [Convert]::ToBase64String($b).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}
function ConvertTo-B64Url([byte[]]$b) {
  [Convert]::ToBase64String($b).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

# Supabase 규격 HS256 JWT — payload 의 role 클레임이 Postgres role 로 그대로 매핑된다
function New-SupabaseKey([string]$role, [string]$secret) {
  $iat = [int][double]::Parse((Get-Date -Date (Get-Date).ToUniversalTime() -UFormat %s))
  $exp = $iat + (10 * 365 * 24 * 60 * 60)   # 10년
  $header  = '{"alg":"HS256","typ":"JWT"}'
  $payload = "{`"role`":`"$role`",`"iss`":`"supabase`",`"iat`":$iat,`"exp`":$exp}"
  $hb = ConvertTo-B64Url ([Text.Encoding]::UTF8.GetBytes($header))
  $pb = ConvertTo-B64Url ([Text.Encoding]::UTF8.GetBytes($payload))
  $mac = New-Object System.Security.Cryptography.HMACSHA256
  $mac.Key = [Text.Encoding]::UTF8.GetBytes($secret)
  $sig = ConvertTo-B64Url ($mac.ComputeHash([Text.Encoding]::UTF8.GetBytes("$hb.$pb")))
  "$hb.$pb.$sig"
}

$jwtSecret = New-Secret 48
$lines = @(
  '# addbal 셀프호스팅 스택 — gen-secrets.ps1 가 생성. 커밋 금지.',
  '',
  "JWT_SECRET=$jwtSecret",
  "ANON_KEY=$(New-SupabaseKey 'anon' $jwtSecret)",
  "SERVICE_ROLE_KEY=$(New-SupabaseKey 'service_role' $jwtSecret)",
  '',
  "AUTHENTICATOR_PASSWORD=$(New-Secret 24)",
  "AUTH_ADMIN_PASSWORD=$(New-Secret 24)",
  "STORAGE_ADMIN_PASSWORD=$(New-Secret 24)",
  '',
  '# 공개 URL — Cloudflare 터널 Public Hostname 과 일치해야 한다',
  'API_EXTERNAL_URL=https://challenge.sparkuniverse.kr',
  'SITE_URL=https://challenge.sparkuniverse.kr',
  '# 프론트를 여러 도메인에 올릴 때 (쉼표 구분). 메일 링크가 돌아올 수 있는 곳.',
  'URI_ALLOW_LIST=http://localhost:8000',
  '',
  '# SMTP — 비어 있으면 GoTrue 가 메일을 "조용히" 안 보낸다.',
  '#   /auth/v1/recover 는 HTTP 200 을 그대로 돌려주고 감사로그에도',
  '#   user_recovery_requested 가 남는다. 에러가 어디에도 안 뜨는데 메일만 안 온다.',
  '# Resend 를 쓸 경우 (계정에서 발신 도메인 인증이 끝나 있어야 함):',
  '#   SMTP_HOST=smtp.resend.com / SMTP_PORT=587 / SMTP_USER=resend / SMTP_PASS=<API 키>',
  'SMTP_HOST=',
  'SMTP_PORT=587',
  'SMTP_USER=',
  'SMTP_PASS=',
  'SMTP_SENDER=noreply@sparkuniverse.kr',
  '# SMTP 를 채우기 전까지는 true 여야 한다. false 로 두면 가입자가 인증 메일을',
  '# 기다리다 영원히 로그인 못 한다.',
  'MAILER_AUTOCONFIRM=true'
)
Set-Content -Path $envPath -Value $lines -Encoding utf8
Write-Host "생성 완료: $envPath" -ForegroundColor Green
