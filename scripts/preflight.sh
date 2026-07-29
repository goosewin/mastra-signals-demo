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
if pgrep -f "cloudflared tunnel" >/dev/null; then
  ok "cloudflared already running"
else
  nohup cloudflared tunnel --url "$BASE" --no-autoupdate >/tmp/cf.log 2>&1 &
  printf "  waiting for URL"
  for _ in $(seq 1 30); do
    grep -qE "https://[a-z0-9-]+\.trycloudflare\.com" /tmp/cf.log && break
    printf "."; sleep 2
  done
  printf "\n"
fi
URL=$(grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" /tmp/cf.log | head -1)
if [ -n "$URL" ]; then
  curl -sf -X POST "$BASE/demo/public-url" -H 'Content-Type: application/json' \
    -d "{\"url\":\"$URL\"}" >/dev/null && ok "$URL"
else
  bad "no tunnel URL — phones won't be able to join"
  FAIL=1
fi

step "Reset to a clean baseline"
curl -sf -X POST "$BASE/demo/reset" >/dev/null && ok "repo, backlog and room reset"

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
