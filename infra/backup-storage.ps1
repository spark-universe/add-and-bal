# =====================================================================
# infra/backup-storage.ps1 — 첨부파일(도커 볼륨) 백업
#
#   powershell -ExecutionPolicy Bypass -File infra\backup-storage.ps1
#
# addbal DB 는 spark-center 의 야간 백업 사이드카가 pg_dump 로 받아간다
# (BACKUP_EXTRA_DATABASES=addbal). 그런데 storage.objects 는 파일의
# "메타데이터"일 뿐이고 실제 바이트는 도커 볼륨 addbal_storage 에 있다.
# 그래서 DB 덤프만 가지고 복구하면 제출 목록은 다 보이는데 파일을 누르면
# 전부 404 가 되는, 제일 나쁜 형태의 반쪽 복구가 된다.
#
# 산출물은 spark-center 의 백업 폴더에 같이 떨군다 — 복구할 때 한 군데만
# 보면 되도록.
#
# 스케줄 등록 (매일 03:40 KST — DB 백업 03:30 직후):
#   $a = New-ScheduledTaskAction -Execute powershell.exe `
#          -Argument '-ExecutionPolicy Bypass -File "<이 파일의 절대경로>"'
#   $t = New-ScheduledTaskTrigger -Daily -At 03:40
#   Register-ScheduledTask -TaskName "addbal-storage-backup" -Action $a -Trigger $t
# =====================================================================
param(
  [string]$OutDir = (Join-Path $PSScriptRoot '..\..\spark-center\db\backups'),
  [int]$RetentionDays = 14
)
$ErrorActionPreference = 'Stop'

$OutDir = (Resolve-Path $OutDir).Path
$stamp  = Get-Date -Format 'yyyyMMdd_HHmmss'
$name   = "addbal-storage_$stamp.tar.gz"

Write-Host "[storage-backup] addbal_storage -> $OutDir\$name"

# 볼륨은 WSL2 안에 있어서 호스트에서 직접 못 읽는다. 일회용 컨테이너로
# 볼륨(ro)과 출력 폴더를 같이 물려서 그 안에서 tar 를 뜬다.
$outUnix = ($OutDir -replace '\\', '/')
docker run --rm `
  -v addbal_storage:/data:ro `
  -v "${outUnix}:/out" `
  alpine:3.20 `
  sh -c "tar -czf /out/$name.part -C /data . && mv /out/$name.part /out/$name"
if ($LASTEXITCODE -ne 0) { throw "tar 실패 (exit $LASTEXITCODE)" }

$f = Get-Item (Join-Path $OutDir $name)
if ($f.Length -lt 40) { throw "산출물이 비었습니다: $($f.Length) bytes" }

# 무결성 게이트 — 못 여는 백업은 백업이 아니다. 목록이 나오는지 확인한다.
$count = docker run --rm -v "${outUnix}:/out:ro" alpine:3.20 `
         sh -c "tar -tzf /out/$name | wc -l"
if ($LASTEXITCODE -ne 0) { Remove-Item $f.FullName -Force; throw "무결성 검사 실패 — 산출물 폐기함" }

Write-Host ("[storage-backup] ok  {0}  ({1:N2} MB, 항목 {2}개)" -f $name, ($f.Length / 1MB), $count.Trim())

# 보존 기간 정리
Get-ChildItem $OutDir -Filter 'addbal-storage_*.tar.gz' |
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) } |
  ForEach-Object { Write-Host "[storage-backup] pruned $($_.Name)"; Remove-Item $_.FullName -Force }

# ---------------------------------------------------------------------
# 복구:
#   docker run --rm -v addbal_storage:/data -v "<백업폴더>:/in:ro" alpine:3.20 `
#     sh -c "rm -rf /data/* && tar -xzf /in/addbal-storage_YYYYMMDD_HHMMSS.tar.gz -C /data"
#   그 다음 addbal DB 덤프를 복원해야 메타데이터와 파일이 맞아떨어진다.
# ---------------------------------------------------------------------
