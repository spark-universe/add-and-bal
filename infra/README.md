# addbal 백엔드 (Supabase 셀프호스팅)

발주 & 광고 훈련 사이트의 백엔드. Supabase 호스팅을 쓰지 않고 우리 박스에서
직접 돌린다. 프론트 코드(`js/*.js`)는 supabase-js 를 그대로 쓰며, 바뀐 것은
[`js/supabase.js`](../js/supabase.js) 의 접속 주소 한 곳뿐이다.

```
                    ┌─ 프론트 (Vercel / CF Pages / serve.ps1 — 어디든)
                    │   js/supabase.js 가 도메인 보고 백엔드를 고름
                    ▼
  challenge.sparkuniverse.kr
     │  (spark-center 가 이미 띄운 spark-cloudflared 재사용, 인바운드 포트 0개)
     ▼
  addbal-gw            nginx:1.29-alpine     경로 3개 분기 + prefix 제거
     ├─ /rest/v1/    → addbal-rest       PostgREST v13     sb.from(...)
     ├─ /auth/v1/    → addbal-auth       GoTrue v2.195     로그인/가입
     └─ /storage/v1/ → addbal-storage    storage-api v1.69 과제 첨부
                            │
                            ▼
                     spark-postgres (기존 Postgres 16)  ▸ addbal DB
```

컨테이너 4개, 실측 메모리 합계 **약 163MB** (gw 17 / rest 35 / auth 10 / storage 101).

**안 띄우는 것**: realtime(`sb.channel` 호출 0건) · edge-functions(0건) ·
imgproxy(이미지 변환 0건) · studio+meta(어드민 화면을 직접 만들어 씀) ·
analytics+vector(도커 로그로 충분) · supavisor(수강생 규모에 불필요) ·
Kong(경로 분기만 필요해서 nginx 로 대체, 이미지 1GB → 10MB).

---

## 구축

```powershell
powershell -ExecutionPolicy Bypass -File infra\bootstrap.ps1
```

재실행해도 안전하다(멱등). 하는 일은 `bootstrap.ps1` 주석 참고. SQL 을 한 번에
못 돌리는 이유는 **GoTrue/storage 가 자기 스키마를 스스로 마이그레이션**하기
때문이다 — `auth.users` 가 생긴 뒤에야 `setup.sql` 의 FK 가 걸린다.

| 파일 | 언제 | 하는 일 |
|---|---|---|
| `sql/01-cluster-roles.sql` | 최초 1회 | Supabase role 6종 + **spark_center 격리 게이트** |
| `sql/02-addbal-init.sql` | 컨테이너 기동 前 | 확장 · auth/storage 스키마 · 기본권한 |
| `sql/03-auth-shim.sql` | 컨테이너 기동 後 | `auth.uid()` 교체 (아래 참고) |
| `supabase/setup.sql` | 스키마 변경 시 | 앱 테이블 14개 + RLS 정책 37개 |
| `sql/04-grants-and-gate.sql` | `setup.sql` 직후 **항상** | 권한 확정 + RLS 게이트 + 캐시 리로드 |
| `sql/05-make-admin.sql` | 어드민 지정 시 | 첫 어드민 (트리거 우회 필요 — 아래) |

### 검증

세 층이 각각 다른 걸 잡는다. 셋 다 돌려야 한다.

```powershell
powershell -File infra\test-e2e.ps1     # 27개 — HTTP 레벨 (curl → 게이트웨이)
node infra\test-client.mjs              # 13개 — 실제 supabase-js 라이브러리
powershell -File serve.ps1              #        (아래 브라우저 테스트의 전제)
node infra\test-browser.mjs             # 18개 — 헤드리스 Chrome + CDP
```

| | 잡는 것 |
|---|---|
| `test-e2e.ps1` | RLS · 권한상승 차단 · 스토리지 경로 격리 · spark_center 격리 |
| `test-client.mjs` | supabase-js 가 우리 게이트웨이 뒤에서 실제로 동작하는지 |
| `test-browser.mjs` | **CORS 강제** (브라우저에서만 일어난다) · 페이지 라우팅 · 콘솔 에러 |

`test-browser.mjs` 는 전용 임시 프로필로 Chrome 을 새로 띄우므로 쓰던 브라우저를
건드리지 않는다. 의존성 0 (Node 24 내장 WebSocket 으로 CDP 직접 호출).

`test-e2e.ps1 -Cleanup` 으로 테스트 계정을 지운다.
테스트 계정: `student1@ / student2@ / admin@addbal.test`, 비밀번호 `addbal-test-1234`.

---

## Cloudflare 터널 연결 (대시보드에서, 레포 수정 없음)

터널은 **원격 관리(run-token) 방식**이라 인그레스가 Cloudflare 대시보드에 있다.
`spark-center` 의 compose 나 이 레포를 고칠 필요가 없다.

1. Cloudflare Zero Trust → Networks → Tunnels → 터널 `spark-center` (`f27565ac…`)
2. **Public Hostname** 추가
   - Subdomain `challenge` / Domain `sparkuniverse.kr`
   - Type `HTTP`, URL `addbal-gw:80`
3. 저장하면 DNS CNAME 이 자동 생성된다.

확인:
```powershell
curl.exe -s https://challenge.sparkuniverse.kr/health     # -> addbal-gw ok
```

> `addbal-gw` 는 `spark-center_default` 네트워크에 있어서 `spark-cloudflared`
> 가 컨테이너 이름으로 바로 찾는다. 포트를 새로 열 필요가 없다.

### 프론트 도메인을 추가할 때

`js/supabase.js` 는 **localhost 가 아니면 무조건 운영 백엔드**를 쓴다. 그래서
프론트를 어디에 올리든 코드 수정이 없다. 다만 비밀번호 재설정 메일의 링크가
돌아올 곳은 GoTrue 가 정하므로, `infra/.env` 에 도메인을 등록해야 한다:

```
SITE_URL=https://실제-프론트-도메인
URI_ALLOW_LIST=https://다른-도메인,https://또-다른-도메인
```
바꾼 뒤 `docker compose up -d addbal-auth`.

---

## 운영

```powershell
cd infra
docker compose ps
docker compose logs -f addbal-auth        # 로그인 문제
docker compose logs -f addbal-storage     # 업로드 문제
docker compose restart                    # 통째로 재시작
```

**업스트림만 재시작하지 말 것.** nginx 가 `proxy_pass` 를 정적으로 쓰기 때문에
(한글 파일명 인코딩 보존을 위해 — `nginx.conf` 주석 참고) 시작할 때 1회만 DNS 를
해석한다. `addbal-rest` 만 재시작하면 IP 가 바뀌어 게이트웨이가 옛 IP 를 계속
찌른다. `docker compose restart` 로 같이 올리거나, PostgREST 캐시 리로드처럼
재시작이 필요 없는 경우엔 시그널을 쓴다:

```powershell
docker kill -s SIGUSR1 addbal-rest        # 스키마 캐시만 리로드 (IP 유지)
```

### 스키마를 바꿨을 때

`setup.sql` 을 고쳤으면 **04 를 반드시 같이** 돌린다. 새 테이블에 권한이 안 붙고
RLS 게이트도 안 돌아서 조용히 뚫리거나 조용히 막힌다.

```powershell
docker cp ..\supabase\setup.sql spark-postgres:/tmp/
docker cp sql\04-grants-and-gate.sql spark-postgres:/tmp/
docker exec -u postgres spark-postgres psql -v ON_ERROR_STOP=1 -d addbal -f /tmp/setup.sql
docker exec -u postgres spark-postgres psql -v ON_ERROR_STOP=1 -d addbal -f /tmp/04-grants-and-gate.sql
```

스키마 캐시는 04 가 심어둔 이벤트 트리거가 알아서 깨운다.

---

## 알아둘 것 (실제로 물린 것들)

**1. 첫 어드민은 평범한 UPDATE 로 못 만든다.**
`setup.sql` 맨 아래 안내된 `update profiles set role='admin'` 은 아무 일도
하지 않는다. 같은 파일이 만든 `protect_profile_fields` 트리거가
`is_admin()` 이 false 면 값을 되돌리는데, psql 에서는 `auth.uid()` 가 NULL 이라
항상 false 다. `UPDATE 1` 이 찍히면서 값만 안 바뀐다. → `sql/05-make-admin.sql`

**2. `auth.uid()` 는 우리가 갈아끼운 것이다.**
GoTrue 가 심는 원본은 구형 GUC(`request.jwt.claim.sub`)만 읽는데 PostgREST v13
은 JSON(`request.jwt.claims`)으로 심는다. 그대로 두면 `auth.uid()` 가 항상 NULL
이라 **RLS 37개가 에러 없이 전부 거부**된다. GoTrue 를 메이저 업그레이드하면
`03-auth-shim.sql` 을 다시 돌릴 것.

**3. 한글 파일명은 스토리지 키로 못 쓴다.**
storage-api 가 객체 키를 S3 안전문자(사실상 ASCII)로만 받는다. 호스팅 Supabase
도 같은 코드라 동일한 제약이다. 그래서 [`js/util.js`](../js/util.js) 의
`storageKey()` 가 키만 안전화하고, 원본 파일명은 DB 의 `file_name` 에 그대로
남아 화면에 보인다.

**4. role 은 클러스터 전역이다.**
`anon` / `authenticated` / `authenticator` 등이 `spark-postgres` 전체에 생긴다.
`authenticator` 는 인터넷에서 도달 가능한 role 이므로,
`01-cluster-roles.sql` 이 `spark_center` 의 PUBLIC CONNECT 를 회수하고 기존
`spark_*` / `campaign` 에만 명시적으로 부여한다. 이 게이트는 `test-e2e.ps1` 의
[7] 이 매번 다시 확인한다.

---

## 백업 / 복원

**DB** — `spark-center` 의 야간 백업 사이드카가 같이 받아간다
(`BACKUP_EXTRA_DATABASES=addbal`, 매일 03:30 KST → `spark-center/db/backups/addbal_*.dump`).

**첨부파일** — pg_dump 는 `storage.objects` 의 *메타데이터*만 담는다. 실제
바이트는 도커 볼륨 `addbal_storage` 에 있다. 둘 다 있어야 복구가 성립한다
(DB 만 복원하면 목록은 보이는데 파일이 전부 404 나는 반쪽 복구가 된다).

```powershell
powershell -File infra\backup-storage.ps1     # 03:40 스케줄 등록법은 파일 주석 참고
```

### 복원

```powershell
# 1) DB
docker exec -u postgres spark-postgres createdb -U postgres addbal
docker cp <백업>\addbal_YYYYMMDD_HHMMSS.dump spark-postgres:/tmp/
docker exec -u postgres spark-postgres pg_restore -U postgres --no-owner -d addbal /tmp/addbal_....dump

# 2) 첨부파일 (같은 시각 것으로)
docker run --rm -v addbal_storage:/data -v "<백업폴더>:/in:ro" alpine:3.20 `
  sh -c "rm -rf /data/* && tar -xzf /in/addbal-storage_YYYYMMDD_HHMMSS.tar.gz -C /data"
```

> **오프박스 백업이 아직 꺼져 있다.** `spark-center/db/backup/offbox.env` 가 없어
> `BACKUP_REMOTE` 가 미설정이고, 덤프가 PGDATA 와 **같은 NVMe** 에만 쌓인다.
> 이건 addbal 이전부터 있던 상태이며 백업 로그가 매 실행 경고를 찍고 있다.
> `offbox.env.example` 을 복사해 채우면 addbal 덤프도 같은 경로로 함께 나간다.

---

## 남은 작업 (전부 계정/대시보드 접근이 필요해 코드로는 못 끝냄)

### 1. SMTP — 지금은 **소리 없이** 실패한다

실제로 확인한 증상이다. SMTP 가 비어 있어도:

```
POST /auth/v1/recover  ->  HTTP 200
GoTrue 감사로그        ->  user_recovery_requested 기록됨
에러 로그              ->  없음
실제 메일              ->  안 감
```

클라이언트도 서버도 성공했다고 말하는데 메일만 안 온다. 수강생은 "메일이 안
와요" 라고 하고 로그를 봐도 정상으로 보인다. `admin/users.html` 의 비밀번호
재설정이 이 상태다.

`infra/.env` 를 채우고 `docker compose up -d addbal-auth` 하면 된다.
**Resend 계정은 이미 있다** (`gsk` 프로젝트가 쓰는 중):

```
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASS=<Resend API 키>
SMTP_SENDER=noreply@<인증된 발신 도메인>
```

> 다만 gsk 의 키는 발신 도메인이 `gsk-official.com` 이라 훈련 사이트 메일이
> 엉뚱한 브랜드로 나간다. `sparkuniverse.kr` 을 Resend 에 발신 도메인으로
> 추가하고 그 계정의 키를 쓰는 게 맞다.

SMTP 를 붙인 뒤 `MAILER_AUTOCONFIRM=false` 로 바꾸면 가입 이메일 인증도 켜진다.
**순서를 바꾸면 안 된다** — SMTP 없이 false 로 두면 신규 가입자가 인증 메일을
기다리다 영원히 로그인하지 못한다.

### 2. Cloudflare Public Hostname 등록

대시보드에서만 가능하다. 이 박스에는 Cloudflare **API 토큰이 없고**
(`spark-center/.env` 의 것은 터널 실행 전용 run-token 이라 API 호출 불가),
`cert.pem`·`.cloudflared` 폴더도 없으며 `cloudflared`/`wrangler` CLI 도 설치돼
있지 않다. 절차는 위 "Cloudflare 터널 연결" 참고.

### 3. 오프박스 백업

`spark-center/db/backup/offbox.env` 가 없고 rclone 설정도 없다(템플릿만 존재).
B2 계정 키가 있어야 한다. 채우면 `addbal_*.dump` 도 같은 경로로 함께 나간다.
첨부파일 tar 는 `backup-storage.ps1` 이 로컬에만 떨구므로, 오프박스를 켜면
그 산출물도 함께 보내도록 한 줄 추가하는 게 좋다.
