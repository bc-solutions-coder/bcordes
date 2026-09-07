# ---------- Base stage: pnpm + the workspace dependency layer ----------
FROM node:24-alpine AS base

# Install pnpm directly (avoids corepack's flaky npm registry calls)
RUN npm install -g pnpm@10.28.2

WORKDIR /app

# Every workspace manifest must be present before install, or pnpm cannot
# resolve the workspace graph the lockfile was built from.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/web/package.json ./apps/web/
COPY packages/ ./packages/

# @bc-solutions-coder/* resolves to GitHub Packages, which rejects even reads
# without a token, so .npmrc's ${NODE_AUTH_TOKEN} must be populated from a
# BuildKit secret: docker build --secret id=node_auth_token,env=NODE_AUTH_TOKEN
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store --mount=type=secret,id=node_auth_token,target=/tmp/node_auth_token sh -eu -c 'test -s /tmp/node_auth_token; printf "//npm.pkg.github.com/:_authToken=%s\n" "$(cat /tmp/node_auth_token)" > /tmp/build.npmrc; NPM_CONFIG_USERCONFIG=/tmp/build.npmrc pnpm install --frozen-lockfile; rm -f /tmp/build.npmrc'


# ---------- Builder stage: build the app ----------
FROM node:24-alpine AS builder
RUN npm install -g pnpm@10.28.2
WORKDIR /app

# The installed workspace: root + per-package node_modules, manifests, lockfile
COPY --from=base /app ./

# Copy the rest of the source code into the image
COPY . .

# Build only the app package; the workspace root has no build of its own
RUN pnpm --filter bcordes build


# ---------- Runtime stage: minimal image to actually run the server ----------
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache wget && \
    addgroup -S app && adduser -S app -G app

# Copy only what's needed to run (Nitro bundles its own deps)
COPY --chown=app:app --from=builder /app/apps/web/.output ./.output

USER app

# Defaults for non-secret env vars — secrets should be passed at runtime
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]
