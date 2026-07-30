#!/usr/bin/env bash
# Everything that has to be true before you walk on stage.
# Run this AFTER `nub run dev` is up in its own terminal.
set -uo pipefail

PORT=4111
BASE="http://localhost:$PORT"
ok() { printf "  \033[32m✓\033[0m %s\n" "$1"; }
bad() { printf "  \033[31m✗\033[0m %s\n" "$1"; }
step() { printf "\n\033[1m%s\033[0m\n" "$1"; }

FAIL=0

step "MongoDB"
if docker ps --format '{{.Names}}' | grep -q '^agenthour-mongo$'; then
  ok "container running"
else
  docker start agenthour-mongo >/dev/null 2>&1 ||
    docker run -d --name agenthour-mongo -p 27017:27017 mongo:7 --replSet rs0 --bind_ip_all >/dev/null
  sleep 4
  docker exec agenthour-mongo mongosh --quiet --eval \
    'try{rs.status()}catch(e){rs.initiate({_id:"rs0",members:[{_id:0,host:"localhost:27017"}]})}' >/dev/null 2>&1
  ok "container started"
fi

step "Mastra dev server"
if curl -sf "$BASE/demo/health" >/dev/null 2>&1; then
  ok "up on :$PORT"
else
  bad "not running — start it first:  nub run dev"
  exit 1
fi

step "Tunnel"
# A running cloudflared process does NOT mean a working tunnel: quick-tunnel hostnames
# are deregistered on disconnect (laptop sleep, network change) while the process lives
# on. Trusting `pgrep` here once put a dead QR code in front of a full room. The only
# valid check is fetching the public URL from the outside — and if that fails, the old
# process is worthless: kill it and mint a fresh tunnel.
tunnel_url() { grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" /tmp/cf.log 2>/dev/null | head -1; }
# Resolve via public DNS (1.1.1.1), not the local cache: the machine that just watched
# this hostname fail has negative-cached it, while the audience's resolvers see the
# fresh record. An A record is required — phones on IPv4 networks can't use AAAA-only.
publicly_reachable() {
  H=${1#https://}
  IP=$(dig +short @1.1.1.1 A "$H" 2>/dev/null | grep -E '^[0-9.]+$' | head -1)
  [ -z "$IP" ] && return 1
  curl -sf --max-time 10 --resolve "$H:443:$IP" "https://$H/phone" >/dev/null 2>&1
}

URL=$(tunnel_url)
if [ -n "$URL" ] && pgrep -f "cloudflared tunnel" >/dev/null && publicly_reachable "$URL"; then
  ok "existing tunnel verified from outside: $URL"
else
  [ -n "$URL" ] && printf "  stale tunnel (%s) — restarting\n" "$URL"
  pkill -f "cloudflared tunnel" 2>/dev/null; sleep 1
  rm -f /tmp/cf.log
  nohup cloudflared tunnel --url "$BASE" --no-autoupdate >/tmp/cf.log 2>&1 &
  printf "  waiting for URL"
  for _ in $(seq 1 30); do
    [ -n "$(tunnel_url)" ] && break
    printf "."; sleep 2
  done
  printf "\n"
  URL=$(tunnel_url)
fi

# Fresh quick-tunnel hostnames take a few seconds to appear in DNS — retry before judging.
REACHABLE=no
if [ -n "$URL" ]; then
  printf "  verifying from outside"
  for _ in $(seq 1 12); do
    publicly_reachable "$URL" && { REACHABLE=yes; break; }
    printf "."; sleep 5
  done
  printf "\n"
fi
if [ "$REACHABLE" = "yes" ]; then
  curl -sf -X POST "$BASE/demo/public-url" -H 'Content-Type: application/json' \
    -d "{\"url\":\"$URL\"}" >/dev/null && ok "public URL serves /phone from the outside: $URL"
else
  bad "tunnel is NOT publicly reachable — do not put the QR on screen"
  FAIL=1
fi

step "Reset to a clean baseline"
curl -sf -X POST "$BASE/demo/reset" >/dev/null && ok "repo, backlog and room reset"

step "Routes"
# /src/pricing.ts exercises esbuild — a dependency that resolves under a flat
# node_modules but not an isolated one. Cheap check, silent failure otherwise.
for route in /wall /phone /deck /cafe /src/pricing.ts; do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE$route")
  if [ "$CODE" = "200" ]; then ok "$route"; else bad "$route returned $CODE"; FAIL=1; fi
done

step "Health"
HEALTH=$(curl -s "$BASE/demo/health")
check() {
  if echo "$HEALTH" | grep -q "\"$1\":$2"; then ok "$3"; else bad "$3"; FAIL=1; fi
}
check mongo true "mongo reachable"
check repo true "target repo present"
check openaiKey true "OPENAI_API_KEY set"
check baselineOk true "order page still has its 4 bugs"

step "GitHub"
if gh auth status >/dev/null 2>&1; then ok "gh authenticated"; else bad "gh not authenticated — the PR will fail"; FAIL=1; fi

echo
if [ "$FAIL" -eq 0 ]; then
  printf "\033[32m\033[1mReady.\033[0m\n\n"
  echo "  Wall    $BASE/wall          → projector, fullscreen"
  echo "  Phones  $URL/phone"
  echo "  Deck    deck/slides.html"
  echo
  echo "  Do one silent full run now, then press 0 to reset."
else
  printf "\033[31m\033[1mNot ready — fix the ✗ above.\033[0m\n"
  exit 1
fi
