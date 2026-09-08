#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

verify_image="${IMAGE:-bcordes:verify-$$}"
verify_build=true
if [ "$#" -eq 0 ]; then
  : "${NODE_AUTH_TOKEN:?Export NODE_AUTH_TOKEN with package read access}"
elif [ "$#" -eq 2 ] && [ "$1" = --image ]; then
  verify_image="$2"
  verify_build=false
else
  echo 'Usage: verify-docker.sh [--image LOCAL_IMAGE]' >&2
  exit 2
fi
verify_name="bcordes-verify-$$"
verify_network="$verify_name-network"
verify_cache="$verify_name-valkey"
verify_secret="$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))")"
cleanup() {
  docker rm -f "$verify_name" "$verify_cache" >/dev/null 2>&1 || true
  docker network rm "$verify_network" >/dev/null 2>&1 || true
}
trap cleanup EXIT

if [ "$verify_build" = true ]; then
  docker build --secret id=node_auth_token,env=NODE_AUTH_TOKEN -t "$verify_image" .
fi
verify_image="$(docker image inspect --format '{{.Id}}' "$verify_image")"
echo "Verifying image $verify_image"
docker network create "$verify_network" >/dev/null
docker run -d --rm --name "$verify_cache" --network "$verify_network" valkey/valkey:8-alpine >/dev/null
for verify_domain in bcordes.example alternate.example; do
  echo "Checking public serving with callback/logout origin https://$verify_domain"
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
  if ! node --input-type=module - "$verify_url/api/health" "${VERIFY_READINESS_TIMEOUT_MS:-30000}" <<'NODE'
import assert from 'node:assert/strict'
import { setTimeout } from 'node:timers/promises'
const [url, timeoutText] = process.argv.slice(2)
const timeout = Number(timeoutText)
assert.ok(Number.isSafeInteger(timeout) && timeout > 0, 'Readiness timeout must be positive milliseconds')
const deadline = performance.now() + timeout
let lastFailure = 'no response'
let ready = false
while (performance.now() < deadline) {
  try {
    const response = await fetch(url, {
      redirect: 'manual',
      signal: AbortSignal.timeout(Math.max(1, Math.ceil(Math.min(2000, deadline - performance.now())))),
    })
    await response.body?.cancel()
    if (response.status === 200) { ready = true; break }
    lastFailure = `HTTP ${response.status}`
  } catch (error) { lastFailure = error.message }
  await setTimeout(Math.max(0, Math.min(1000, deadline - performance.now())))
}
if (!ready) {
  console.error(`Health did not return direct 200 within ${timeout}ms: ${lastFailure}`)
  process.exitCode = 1
}
NODE
  then
    echo 'Production container did not become ready' >&2
    docker logs "$verify_name" >&2
    exit 1
  fi
  node scripts/verify-production.mjs "$verify_url"
  docker stop "$verify_name" >/dev/null
done
