FROM node:24-alpine AS base

RUN npm install -g pnpm@11.26.0

WORKDIR /app

# Include all workspace manifests so pnpm can resolve local dependencies.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/web/package.json ./apps/web/
COPY packages/auth/package.json ./packages/auth/
COPY packages/authz/package.json ./packages/authz/
COPY packages/config/package.json ./packages/config/
COPY packages/forms/package.json ./packages/forms/
COPY packages/logger/package.json ./packages/logger/
COPY packages/navigation/package.json ./packages/navigation/
COPY packages/query/package.json ./packages/query/
COPY packages/server/package.json ./packages/server/
COPY packages/test-utils/package.json ./packages/test-utils/
COPY packages/ui/package.json ./packages/ui/
COPY packages/utils/package.json ./packages/utils/
COPY packages/valkey/package.json ./packages/valkey/
COPY packages/wallow/package.json ./packages/wallow/

# Pass the registry token as a BuildKit secret named node_auth_token.
# The install reads it through a temporary npm user config. See docs/deployment.md.
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store --mount=type=secret,id=node_auth_token,target=/tmp/node_auth_token sh -eu -c 'test -s /tmp/node_auth_token; printf "//npm.pkg.github.com/:_authToken=%s\n" "$(cat /tmp/node_auth_token)" > /tmp/build.npmrc; PNPM_CONFIG_USERCONFIG=/tmp/build.npmrc pnpm install --frozen-lockfile; rm -f /tmp/build.npmrc'


FROM base AS builder

COPY . .

RUN pnpm --filter bcordes build


FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache wget && \
    addgroup -S app && adduser -S app -G app

# Nitro bundles the server dependencies into .output.
COPY --chown=app:app --from=builder /app/apps/web/.output ./.output

USER app

ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
