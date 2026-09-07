#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

: "${NODE_AUTH_TOKEN:?Export NODE_AUTH_TOKEN with package read access}"
verify_image="${IMAGE:-bcordes:verify-$$}"
verify_name="bcordes-verify-$$"
verify_network="$verify_name-network"
verify_cache="$verify_name-valkey"
verify_secret="$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))")"
cleanup() {
  docker rm -f "$verify_name" "$verify_cache" >/dev/null 2>&1 || true
  docker network rm "$verify_network" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker build --secret id=node_auth_token,env=NODE_AUTH_TOKEN -t "$verify_image" .
docker network create "$verify_network" >/dev/null
docker run -d --rm --name "$verify_cache" --network "$verify_network" valkey/valkey:8-alpine >/dev/null
for verify_domain in bcordes.example alternate.example; do
  docker run -d --rm --name "$verify_name" --network "$verify_network" -p 127.0.0.1::3000 \
    -e "COOKIE_PASSWORD=$verify_secret" -e BFF_APP_ID=bcordes-smoke \
    -e BFF_API_BASE_URL=http://127.0.0.1:1 \
    -e "REDIS_URL=redis://$verify_cache:6379" \
    -e OIDC_ISSUER=https://issuer.example \
    -e OIDC_CLIENT_ID=smoke-check -e OIDC_CLIENT_SECRET=smoke-check \
    -e "OIDC_REDIRECT_URI=https://$verify_domain/bff/callback" \
    -e "OIDC_POST_LOGOUT_REDIRECT_URI=https://$verify_domain/" \
    "$verify_image" >/dev/null
  verify_binding="$(docker port "$verify_name" 3000/tcp)"
  verify_url="http://127.0.0.1:${verify_binding##*:}"
  verify_ready=false
  for _ in $(seq 1 30); do
    if curl --silent --fail "$verify_url/api/health" >/dev/null; then
      verify_ready=true
      break
    fi
    sleep 1
  done
  if [ "$verify_ready" != true ]; then
    echo 'Production container did not become ready' >&2
    docker logs "$verify_name" >&2
    exit 1
  fi
  node scripts/verify-production.mjs "$verify_url"
  docker stop "$verify_name" >/dev/null
 done
