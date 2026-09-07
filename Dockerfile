FROM node:24-alpine AS base

RUN npm install -g pnpm@11.26.0

WORKDIR /app

# Include all workspace manifests so pnpm can resolve local dependencies.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/web/package.json ./apps/web/
COPY packages/ ./packages/

# Pass the registry token as a BuildKit secret named node_auth_token.
# The install reads it through a temporary npm user config. See docs/deployment.md.
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store --mount=type=secret,id=node_auth_token,target=/tmp/node_auth_token sh -eu -c 'test -s /tmp/node_auth_token; printf "//npm.pkg.github.com/:_authToken=%s\n" "$(cat /tmp/node_auth_token)" > /tmp/build.npmrc; PNPM_CONFIG_USERCONFIG=/tmp/build.npmrc pnpm install --frozen-lockfile; rm -f /tmp/build.npmrc'


FROM node:24-alpine AS builder
RUN npm install -g pnpm@11.26.0
WORKDIR /app

COPY --from=base /app ./

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
