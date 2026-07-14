#!/usr/bin/env bash
# Acceptance gate for the workspace Dockerfile: build the image, run the
# container, and require HTTP 200 on /. A successful build does not prove the
# runtime stage copied the right .output path, so we actually serve a request.
set -euo pipefail

cd "$(dirname "$0")/.."

IMAGE="${IMAGE:-bcordes:wsmigrate}"
PORT="${PORT:-3000}"
NAME="bcordes-verify-$$"

# The lockfile pulls @bc-solutions-coder/* from GitHub Packages, which 401s on
# an anonymous read, so the install layer needs a token. Sourced from .env when
# it is not already exported.
if [ -z "${NODE_AUTH_TOKEN:-}" ] && [ -f .env ]; then
  NODE_AUTH_TOKEN="$(sed -n 's/^NODE_AUTH_TOKEN=//p' .env | tail -1 | tr -d '"'"'"'')"
  export NODE_AUTH_TOKEN
fi
if [ -z "${NODE_AUTH_TOKEN:-}" ]; then
  echo "==> FAILED: NODE_AUTH_TOKEN is not set (needed to install from GitHub Packages)"
  exit 1
fi

echo "==> docker build -t $IMAGE ."
docker build --secret id=node_auth_token,env=NODE_AUTH_TOKEN -t "$IMAGE" .

cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "==> docker run --env-file .env $IMAGE"
docker run -d --rm --name "$NAME" -p "$PORT:3000" --env-file .env "$IMAGE" >/dev/null

for _ in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PORT/" || true)
  if [ "$code" = "200" ]; then
    echo "==> GET / -> 200 OK"
    exit 0
  fi
  sleep 1
done

echo "==> FAILED: GET / never returned 200 (last: ${code:-none})"
docker logs "$NAME" 2>&1 | tail -30
exit 1
