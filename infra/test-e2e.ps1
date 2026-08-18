# =====================================================================
# infra/test-e2e.ps1 — addbal 셀프호스팅 스택 E2E 검증
#
#   powershell -ExecutionPolicy Bypass -File infra\test-e2e.ps1
#   powershell -ExecutionPolicy Bypass -File infra\test-e2e.ps1 -Cleanup
#
# 브라우저와 똑같이 게이트웨이(127.0.0.1:8100)만 통해서 때린다. DB 에 직접
# 붙지 않는다 — nginx 경로 분기 / JWT 검증 / RLS 를 한 번에 지나가야 의미가 있다.
#
# 확인 안 하면 조용히 터지는 것들만 골라서 넣었다:
#   · handle_new_user 트리거 (가입 → profiles 자동 생성)
#   · 타인 프로필 격리 (RLS)
#   · 권한 상승 차단 (protect_profile_fields — 수강생이 자기 level 을 못 올림)
#   · 스토리지 경로 격리 (남의 uid 폴더에 업로드 금지)
#   · 한글 파일명 (nginx 가 경로를 재인코딩하면서 깨지는지)
# =====================================================================
param([switch]$Cleanup)

$ErrorActionPreference = 'Stop'
$B = 'http://127.0.0.1:8100'
$cfg = @{}
Get-Content (Join-Path $PSScriptRoot '.env') |
  Where-Object { $_ -match '^[A-Z_]+=' } |
  ForEach-Object { $kv = $_ -split '=', 2; $cfg[$kv[0]] = $kv[1] }

$ANON = $cfg.ANON_KEY
$SVC  = $cfg.SERVICE_ROLE_KEY
$PW   = 'addbal-test-1234'
$USERS = @(
  @{ email = 'student1@addbal.test'; name = '테스트수강생1'; phone = '010-0000-0001' },
  @{ email = 'student2@addbal.test'; name = '테스트수강생2'; phone = '010-0000-0002' },
  @{ email = 'admin@addbal.test';    name = '테스트어드민';  phone = '010-0000-0009' }
)

$script:pass = 0; $script:fail = 0
function Check($name, $ok, $detail) {
  if ($ok) { $script:pass++; Write-Host ("  PASS  " + $name) -ForegroundColor Green }
  else     { $script:fail++; Write-Host ("  FAIL  " + $name + "  <- " + $detail) -ForegroundColor Red }
}

# curl 로 호출하고 (본문, 상태코드) 를 돌려준다
function Req {
  param([string]$Method, [string]$Path, [string]$Token, $Body, [string[]]$Extra)
  $a = @('-s', '-w', "`n%{http_code}", '-X', $Method, "$B$Path",
         '-H', "apikey: $ANON", '-H', "Authorization: Bearer $Token")
  # JSON 을 -d 로 직접 넘기면 PowerShell 5.1 이 네이티브 exe 로 전달하면서
  # 큰따옴표를 벗겨버려 GoTrue 가 bad_json 을 뱉는다. 파일로 넘긴다.
  # (BOM 이 붙으면 파서가 또 깨지므로 BOM 없는 UTF-8 로 쓴다.)
  $tmpBody = $null
  if ($null -ne $Body) {
    $tmpBody = [IO.Path]::GetTempFileName()
    [IO.File]::WriteAllText($tmpBody, ($Body | ConvertTo-Json -Compress -Depth 6), [Text.UTF8Encoding]::new($false))
    $a += @('-H', 'Content-Type: application/json', '--data-binary', "@$tmpBody")
  }
  if ($Extra) { foreach ($e in $Extra) { $a += @('-H', $e) } }
  $out = & curl.exe @a
  if ($tmpBody) { Remove-Item $tmpBody -Force -ErrorAction SilentlyContinue }
  $lines = $out -split "`n"
  $code = [int]($lines[-1])
  $bodyText = ($lines[0..($lines.Length - 2)] -join "`n")
  $json = $null
  if ($bodyText) { try { $json = $bodyText | ConvertFrom-Json } catch { } }
  [pscustomobject]@{ Code = $code; Text = $bodyText; Json = $json }
}

# ── 정리 모드 ────────────────────────────────────────────────────────
if ($Cleanup) {
  Write-Host "테스트 계정/파일 정리 중..." -ForegroundColor Yellow
  $emails = ($USERS | ForEach-Object { "'" + $_.email + "'" }) -join ','
  docker exec -u postgres spark-postgres psql -d addbal -c `
    "delete from storage.objects where owner in (select id from auth.users where email in ($emails)); delete from auth.users where email in ($emails);"
  Write-Host "정리 완료." -ForegroundColor Green
  exit 0
}

Write-Host "`n===== addbal E2E =====" -ForegroundColor Cyan

# 매번 깨끗한 상태에서 시작한다. 이전 실행이 남긴 계정을 재사용하면
# [4] 에서 바꾼 이름 때문에 [1] 의 가입 메타 검사가 엉뚱하게 실패한다.
$emailList = ($USERS | ForEach-Object { "'" + $_.email + "'" }) -join ','
docker exec -u postgres spark-postgres psql -d addbal -q -c `
  "begin; set local session_replication_role = replica; delete from storage.objects where owner in (select id from auth.users where email in ($emailList)); set local session_replication_role = origin; delete from auth.users where email in ($emailList); commit;" | Out-Null

# ── 1. 가입 ──────────────────────────────────────────────────────────
Write-Host "`n[1] 가입 (GoTrue) + profiles 자동 생성 트리거"
$ids = @{}
foreach ($u in $USERS) {
  $r = Req -Method POST -Path '/auth/v1/signup' -Token $ANON -Body @{
    email = $u.email; password = $PW
    data  = @{ name = $u.name; phone = $u.phone }
  }
  if ($r.Code -eq 200 -and $r.Json.user.id) {
    $ids[$u.email] = $r.Json.user.id
    Check "가입 $($u.email)" $true ''
  } elseif ($r.Text -match 'already registered|already been registered') {
    # 재실행 대비: 이미 있으면 로그인해서 id 를 가져온다
    $l = Req -Method POST -Path '/auth/v1/token?grant_type=password' -Token $ANON -Body @{ email = $u.email; password = $PW }
    if ($l.Json.user.id) { $ids[$u.email] = $l.Json.user.id; Check "가입 $($u.email) (기존 계정 재사용)" $true '' }
    else { Check "가입 $($u.email)" $false $r.Text }
  } else {
    Check "가입 $($u.email)" $false "code=$($r.Code) $($r.Text)"
  }
}
if ($ids.Count -lt 3) { Write-Host "가입이 안 됐으므로 중단합니다." -ForegroundColor Red; exit 1 }

# handle_new_user 트리거가 profiles 를 만들었는지 (service_role 로 확인)
$p = Req -Method GET -Path "/rest/v1/profiles?select=id,name,phone,email,role,level,status" -Token $SVC
$made = @($p.Json | Where-Object { $ids.Values -contains $_.id })
Check "profiles 자동 생성 3건 (handle_new_user)" ($made.Count -eq 3) "실제 $($made.Count)건"
$s1 = $made | Where-Object { $_.id -eq $ids['student1@addbal.test'] }
Check "가입 메타(name/phone) 가 profiles 로 복사됨" ($s1.name -eq '테스트수강생1' -and $s1.phone -eq '010-0000-0001') "name=$($s1.name) phone=$($s1.phone)"
Check "신규 가입 기본값 role=student / level=0 / status=pending" `
  ($s1.role -eq 'student' -and $s1.level -eq 0 -and $s1.status -eq 'pending') `
  "role=$($s1.role) level=$($s1.level) status=$($s1.status)"

# ── 2. 로그인 ────────────────────────────────────────────────────────
Write-Host "`n[2] 로그인 (비밀번호 grant)"
$tok = @{}
foreach ($u in $USERS) {
  $r = Req -Method POST -Path '/auth/v1/token?grant_type=password' -Token $ANON -Body @{ email = $u.email; password = $PW }
  $tok[$u.email] = $r.Json.access_token
  Check "로그인 $($u.email)" ($null -ne $r.Json.access_token) "code=$($r.Code) $($r.Text)"
}
$bad = Req -Method POST -Path '/auth/v1/token?grant_type=password' -Token $ANON -Body @{ email = 'student1@addbal.test'; password = 'wrong-password' }
Check "틀린 비밀번호 거부" ($bad.Code -eq 400) "code=$($bad.Code)"

$T1 = $tok['student1@addbal.test']; $T2 = $tok['student2@addbal.test']; $TA = $tok['admin@addbal.test']
$U1 = $ids['student1@addbal.test']; $U2 = $ids['student2@addbal.test']

# ── 3. RLS ───────────────────────────────────────────────────────────
Write-Host "`n[3] RLS — 본인만 보이는가"
$own = Req -Method GET -Path "/rest/v1/profiles?select=id,name" -Token $T1
Check "student1 은 자기 프로필 1건만 조회" (@($own.Json).Count -eq 1 -and $own.Json[0].id -eq $U1) "count=$(@($own.Json).Count)"

$other = Req -Method GET -Path "/rest/v1/profiles?select=id&id=eq.$U2" -Token $T1
Check "student1 이 student2 프로필 조회 불가" (@($other.Json).Count -eq 0) "count=$(@($other.Json).Count) $($other.Text)"

$anonAll = Req -Method GET -Path "/rest/v1/profiles?select=id" -Token $ANON
Check "비로그인(anon) 은 프로필 0건" (@($anonAll.Json).Count -eq 0) "count=$(@($anonAll.Json).Count)"

# ── 4. 권한 상승 차단 ────────────────────────────────────────────────
Write-Host "`n[4] 권한 상승 차단 (protect_profile_fields 트리거)"
$esc = Req -Method PATCH -Path "/rest/v1/profiles?id=eq.$U1" -Token $T1 `
       -Body @{ level = 1; role = 'admin'; status = 'approved' } -Extra @('Prefer: return=representation')
$after = Req -Method GET -Path "/rest/v1/profiles?select=level,role,status&id=eq.$U1" -Token $SVC
Check "수강생이 자기 level/role/status 를 못 올림" `
  ($after.Json[0].level -eq 0 -and $after.Json[0].role -eq 'student' -and $after.Json[0].status -eq 'pending') `
  "level=$($after.Json[0].level) role=$($after.Json[0].role) status=$($after.Json[0].status)"

$nameUpd = Req -Method PATCH -Path "/rest/v1/profiles?id=eq.$U1" -Token $T1 -Body @{ name = '이름변경됨' }
$nameChk = Req -Method GET -Path "/rest/v1/profiles?select=name&id=eq.$U1" -Token $SVC
Check "일반 필드(name) 수정은 허용" ($nameChk.Json[0].name -eq '이름변경됨') "name=$($nameChk.Json[0].name)"

# ── 5. 어드민 ────────────────────────────────────────────────────────
Write-Host "`n[5] 어드민 권한 (is_admin())"
# protect_profile_fields 트리거 때문에 평범한 UPDATE 로는 어드민을 만들 수 없다
# (05-make-admin.sql 주석 참고). 트리거를 세션 한정으로 건너뛴다.
docker exec -u postgres spark-postgres psql -d addbal -q -c `
  "begin; set local session_replication_role = replica; update public.profiles set role='admin', status='approved', level=1 where email='admin@addbal.test'; commit;" | Out-Null
$adminAll = Req -Method GET -Path "/rest/v1/profiles?select=id" -Token $TA
Check "어드민은 전체 프로필 조회 가능" (@($adminAll.Json).Count -ge 3) "count=$(@($adminAll.Json).Count)"
$adminPromote = Req -Method PATCH -Path "/rest/v1/profiles?id=eq.$U1" -Token $TA -Body @{ level = 1 }
$promoted = Req -Method GET -Path "/rest/v1/profiles?select=level&id=eq.$U1" -Token $SVC
Check "어드민은 수강생 level 승급 가능" ($promoted.Json[0].level -eq 1) "level=$($promoted.Json[0].level)"

# ── 6. 스토리지 ──────────────────────────────────────────────────────
Write-Host "`n[6] 스토리지 (업로드 / 경로 격리 / 한글 파일명 / 서명 URL)"
$tmp = Join-Path $env:TEMP 'addbal-e2e-upload.txt'
Set-Content -Path $tmp -Value 'addbal storage e2e' -Encoding utf8

function Upload($token, $objectPath) {
  $enc = ($objectPath -split '/' | ForEach-Object { [Uri]::EscapeDataString($_) }) -join '/'
  $out = & curl.exe -s -w "`n%{http_code}" -X POST "$B/storage/v1/object/submissions/$enc" `
         -H "apikey: $ANON" -H "Authorization: Bearer $token" -H "x-upsert: true" `
         -H "Content-Type: text/plain" --data-binary "@$tmp"
  $lines = $out -split "`n"
  [pscustomobject]@{ Code = [int]($lines[-1]); Text = ($lines[0..($lines.Length - 2)] -join "`n") }
}

$ok1 = Upload $T1 "$U1/shop/e2e-basic.txt"
Check "student1 이 자기 uid 폴더에 업로드" ($ok1.Code -eq 200) "code=$($ok1.Code) $($ok1.Text)"

$deny = Upload $T1 "$U2/shop/hijack.txt"
Check "student1 이 student2 폴더에 업로드 불가" ($deny.Code -ge 400) "code=$($deny.Code) $($deny.Text)"

# storage-api 는 객체 키를 S3 안전문자(ASCII)로만 받는다. 한글 파일명을 그대로
# 키로 쓰면 InvalidKey 로 실패한다 — 호스팅 Supabase 도 같은 코드라 동일하다.
# 그래서 앱이 js/util.js 의 storageKey() 로 키만 안전화한다(원본 이름은
# DB file_name 에 그대로 남는다). 아래 두 검사가 그 계약을 고정한다.
$rawKor = Upload $T1 "$U1/challenge/1/과제 제출(최종).txt"
Check "원본 한글 키는 storage-api 가 거부 (storageKey() 가 필요한 이유)" `
  ($rawKor.Code -ge 400 -and $rawKor.Text -match 'InvalidKey') "code=$($rawKor.Code) $($rawKor.Text)"

# 앱이 실제로 만들어 보내는 형태: "{timestamp}_{안전화된 이름}"
# (한글만으로 된 이름은 storageKey() 가 'f<해시>' 로 바꾼다)
$kor = "$U1/challenge/1/1786790000000_f1a2b3c.txt"
$ok2 = Upload $T1 $kor
Check "안전화된 키(한글 파일 업로드 시 앱이 보내는 형태)로 업로드" ($ok2.Code -eq 200) "code=$($ok2.Code) $($ok2.Text)"

# 공백·괄호는 storage-api 가 허용하므로 그대로 통과해야 한다 (nginx 인코딩 검증)
$spaced = Upload $T1 "$U1/challenge/1/report (final) v2.txt"
Check "공백·괄호 파일명 통과 (nginx 경로 인코딩 보존)" ($spaced.Code -eq 200) "code=$($spaced.Code) $($spaced.Text)"

# 서명 URL 발급 후 실제로 내려받아 내용까지 확인
$encKor = ($kor -split '/' | ForEach-Object { [Uri]::EscapeDataString($_) }) -join '/'
$sign = Req -Method POST -Path "/storage/v1/object/sign/submissions/$encKor" -Token $T1 -Body @{ expiresIn = 60 }
$signedUrl = $sign.Json.signedURL
Check "서명 URL 발급" ($null -ne $signedUrl) "code=$($sign.Code) $($sign.Text)"
if ($signedUrl) {
  $dl = & curl.exe -s -w "`n%{http_code}" "$B/storage/v1$signedUrl"
  $dlLines = $dl -split "`n"
  Check "서명 URL 로 실제 다운로드 (내용 일치)" `
    ([int]($dlLines[-1]) -eq 200 -and ($dlLines -join '') -match 'addbal storage e2e') "code=$($dlLines[-1])"
}

$steal = Req -Method GET -Path "/storage/v1/object/submissions/$U1/shop/e2e-basic.txt" -Token $T2
Check "student2 는 student1 파일 다운로드 불가" ($steal.Code -ge 400) "code=$($steal.Code)"

$adminSign = Req -Method POST -Path "/storage/v1/object/sign/submissions/$U1/shop/e2e-basic.txt" -Token $TA -Body @{ expiresIn = 60 }
Check "어드민은 수강생 제출 파일 열람 가능" ($adminSign.Code -eq 200) "code=$($adminSign.Code) $($adminSign.Text)"

Remove-Item $tmp -Force -ErrorAction SilentlyContinue

# ── 7. 격리 재확인 ───────────────────────────────────────────────────
Write-Host "`n[7] spark_center 격리 (스택 기동 후에도 유지되는지)"
# 접속이 "실패해야" 정상인 검사라, 네이티브 stderr 로 스크립트가 죽지 않게 감싼다
$leak = ''
try {
  $ErrorActionPreference = 'Continue'
  $leak = (& docker exec -e PGPASSWORD="$($cfg.AUTHENTICATOR_PASSWORD)" spark-postgres `
           psql -h 127.0.0.1 -U authenticator -d spark_center -tAc "select 1" 2>&1) -join ' '
} catch { $leak = $_.Exception.Message } finally { $ErrorActionPreference = 'Stop' }
Check "authenticator 가 spark_center 에 못 붙음" ($leak -match 'permission denied') $leak

# ── 결과 ─────────────────────────────────────────────────────────────
Write-Host "`n=====================================" -ForegroundColor Cyan
Write-Host ("통과 {0} / 실패 {1}" -f $script:pass, $script:fail) -ForegroundColor $(if ($script:fail -eq 0) { 'Green' } else { 'Red' })
if ($script:fail -eq 0) {
  Write-Host "`n테스트 계정 (비밀번호 공통: $PW)" -ForegroundColor Cyan
  foreach ($u in $USERS) { Write-Host ("  {0,-22} {1}" -f $u.email, $u.name) }
  Write-Host "  * admin@addbal.test 는 role=admin 으로 승격되어 있음"
  Write-Host "  * 정리: powershell -File infra\test-e2e.ps1 -Cleanup"
}
exit $script:fail
