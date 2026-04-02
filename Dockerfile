# ---------- Base stage: just sets up pnpm + deps layer ----------
FROM node:24-alpine AS base

# Install pnpm directly (avoids corepack's flaky npm registry calls)
RUN npm install -g pnpm@10.28.2

WORKDIR /app

# Copy only the files needed to resolve dependencies
COPY package.json pnpm-lock.yaml ./

# Install deps with BuildKit cache mount for pnpm store
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile


# ---------- Builder stage: build the app ----------
FROM node:24-alpine AS builder
RUN npm install -g pnpm@10.28.2
WORKDIR /app

# Copy installed node_modules from base
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/pnpm-lock.yaml ./pnpm-lock.yaml

# Copy the rest of the source code into the image
COPY . .

# Build your TanStack Start app
# This should generate the production server build output.
# (Common commands are "pnpm build" or "pnpm start build" depending on your scripts)
RUN pnpm build


# ---------- Runtime stage: minimal image to actually run the server ----------
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache wget && \
    addgroup -S app && adduser -S app -G app

# Copy only what's needed to run (Nitro bundles its own deps)
COPY --chown=app:app --from=builder /app/.output ./.output

USER app

# Defaults for non-secret env vars — secrets should be passed at runtime
ENV HOST=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["node", ".output/server/index.mjs"]