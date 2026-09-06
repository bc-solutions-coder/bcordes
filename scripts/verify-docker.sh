#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

: "${NODE_AUTH_TOKEN:?Export NODE_AUTH_TOKEN with read access to the private SDK package}"
verify_image="${IMAGE:-bcordes:verify-$$}"
verify_name="bcordes-verify-$$"
verify_secret="$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))")"
cleanup() {
  docker rm -f "$verify_name" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker build --secret id=node_auth_token,env=NODE_AUTH_TOKEN -t "$verify_image" .
docker run -d --rm --name "$verify_name" -p 127.0.0.1::3000 \
  -e "SESSION_SECRET=$verify_secret" \
  -e WALLOW_API_URL=http://127.0.0.1:1 \
  -e VALKEY_URL=redis://127.0.0.1:1 \
  -e OIDC_ISSUER=http://127.0.0.1:1 \
  -e OIDC_CLIENT_ID=smoke-check \
  -e OIDC_CLIENT_SECRET=smoke-check \
  -e OIDC_REDIRECT_URI=http://127.0.0.1/auth/callback \
  "$verify_image" >/dev/null
verify_binding="$(docker port "$verify_name" 3000/tcp)"
verify_url="http://127.0.0.1:${verify_binding##*:}"
for _ in $(seq 1 30); do
  if curl --silent --fail "$verify_url/" >/dev/null; then
    node scripts/verify-production.mjs "$verify_url"
    exit 0
  fi
  sleep 1
done
echo 'Production container did not serve the home page within 30 seconds' >&2
docker logs "$verify_name" >&2
exit 1
