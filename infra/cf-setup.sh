#!/usr/bin/env bash
# =====================================================================
# infra/cf-setup.sh — Cloudflare 터널 Public Hostname + DNS 등록
#
#   CF_API_TOKEN=<토큰> bash infra/cf-setup.sh
#
# 대시보드에서 Public Hostname 을 추가하는 것과 같은 일을 API 로 한다.
#   1) 터널 ingress 에 challenge.sparkuniverse.kr 규칙 추가
#      (기존 center.sparkuniverse.kr 규칙은 읽어서 그대로 보존)
#   2) CNAME challenge -> <tunnel>.cfargotunnel.com (Proxied)
#
# 필요한 토큰 권한 2개 — 하나라도 빠지면 그 단계에서 Authentication error:
#   Account -> Cloudflare Tunnel -> Edit
#   Zone    -> DNS               -> Edit   (Zone Resources: sparkuniverse.kr)
#
# 계정/터널 ID 는 spark-center/.env 의 터널 run-token 을 base64 디코드해서 얻은
# 값이다. run-token 자체로는 이 API 를 못 부른다(터널 실행 전용).
# JSON 조립은 node 로 한다 — sed 로 ingress 배열을 만지면 기존 규칙이 날아간다.
# =====================================================================
set -euo pipefail

ACCOUNT_ID="81bc993e0eeefa7597c9c51a04f3d9a0"
TUNNEL_ID="f27565ac-c8bc-44bb-b964-30d8e2029115"
ZONE_NAME="sparkuniverse.kr"
SUB="challenge"
HOSTNAME="$SUB.$ZONE_NAME"
SERVICE="http://addbal-gw:80"

: "${CF_API_TOKEN:?CF_API_TOKEN 환경변수가 필요합니다}"
API="https://api.cloudflare.com/client/v4"
AUTH=(-H "Authorization: Bearer $CF_API_TOKEN" -H "Content-Type: application/json")

# /user/tokens/verify 는 계정 스코프 토큰에서 항상 실패하므로 쓰지 않는다.
# 실제로 필요한 엔드포인트를 직접 찔러서 권한을 확인한다.
jq_ok() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{process.exit(JSON.parse(s).success?0:1)}catch(e){process.exit(1)}})"; }

echo "[1] 터널 설정 읽기 (Account:Cloudflare Tunnel:Edit)"
cur=$(curl -s "${AUTH[@]}" "$API/accounts/$ACCOUNT_ID/cfd_tunnel/$TUNNEL_ID/configurations")
printf '%s' "$cur" | jq_ok || { echo "    실패 — 토큰에 Cloudflare Tunnel 권한이 없습니다"; exit 1; }
printf '%s' "$cur" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{JSON.parse(s).result.config.ingress.forEach(r=>console.log('    기존:',r.hostname||'(catch-all)','->',r.service))})"

echo "[2] ingress 에 $HOSTNAME -> $SERVICE 추가 (기존 규칙 보존)"
body=$(printf '%s' "$cur" | node -e "
let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{
  const cfg=JSON.parse(s).result.config, H='$HOSTNAME', V='$SERVICE';
  const ing=cfg.ingress.filter(r=>r.hostname!==H);
  cfg.ingress=[...ing.filter(r=>r.hostname),{hostname:H,service:V},...ing.filter(r=>!r.hostname)];
  process.stdout.write(JSON.stringify({config:cfg}));
})")
curl -s -X PUT "${AUTH[@]}" --data "$body" \
  "$API/accounts/$ACCOUNT_ID/cfd_tunnel/$TUNNEL_ID/configurations" | jq_ok \
  && echo "    OK" || { echo "    ingress 갱신 실패"; exit 1; }

echo "[3] zone ID 조회"
ZONE_ID=$(curl -s "${AUTH[@]}" "$API/zones?name=$ZONE_NAME" \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);process.stdout.write(j.result&&j.result[0]?j.result[0].id:'')})")
[ -n "$ZONE_ID" ] || { echo "    zone 조회 실패"; exit 1; }
echo "    $ZONE_ID"

echo "[4] DNS CNAME $HOSTNAME -> $TUNNEL_ID.cfargotunnel.com (Proxied)"
existing=$(curl -s "${AUTH[@]}" "$API/zones/$ZONE_ID/dns_records?name=$HOSTNAME")
if ! printf '%s' "$existing" | jq_ok; then
  cat <<MSG
    실패 — 토큰에 Zone:DNS:Edit 권한이 없습니다.
    아래 중 하나를 하세요:
      (a) 토큰에 Zone -> DNS -> Edit 를 추가하고 이 스크립트를 다시 실행
      (b) 대시보드에서 DNS 레코드를 직접 추가:
            Type    CNAME
            Name    $SUB
            Target  $TUNNEL_ID.cfargotunnel.com
            Proxy   ON (주황색 구름)
    ingress(2단계)는 이미 반영됐으므로 DNS 만 만들면 바로 열립니다.
MSG
  exit 2
fi
if printf '%s' "$existing" | grep -q "\"name\":\"$HOSTNAME\""; then
  echo "    이미 존재 — 생략"
else
  curl -s -X POST "${AUTH[@]}" \
    --data "{\"type\":\"CNAME\",\"name\":\"$SUB\",\"content\":\"$TUNNEL_ID.cfargotunnel.com\",\"proxied\":true,\"ttl\":1}" \
    "$API/zones/$ZONE_ID/dns_records" | jq_ok && echo "    생성됨" || { echo "    생성 실패"; exit 1; }
fi

echo "[5] 접속 확인"
for i in $(seq 1 12); do
  code=$(curl -s -o /dev/null -m 8 -w "%{http_code}" "https://$HOSTNAME/health" || true)
  echo "    시도 $i: HTTP $code"
  [ "$code" = "200" ] && { echo; echo "완료 -> https://$HOSTNAME"; exit 0; }
  sleep 5
done
echo "아직 200 이 아닙니다: docker logs spark-cloudflared --tail 30"
