# bcordes.dev

A portfolio and inquiry app built with TanStack Start and React. Wallow provides identity and application APIs; its SDK manages authentication and Valkey-backed sessions. Live updates use server-sent events.

## Get started

Use Node.js 24 and pnpm 10.28.2. Follow [local setup](docs/setup.md) to configure private package access and the local environment, then run from the repository root:

```sh
pnpm install --frozen-lockfile
docker compose --env-file .env.local up -d valkey
cd apps/web
node --env-file=../../.env.local node_modules/vite/bin/vite.js --port 3000
```

Open `http://localhost:3000`. See the [documentation index](docs/README.md) for implementation, testing and deployment guidance.

## Project structure

The application lives in `apps/web`; shared packages live in `packages/`.

```text
.
├── apps/
│   └── web/
│       ├── src/
│       │   ├── routes/
│       │   ├── features/
│       │   ├── shared/       # auth and motion
│       │   └── app/          # application shell
│       └── e2e/
├── packages/
│   ├── auth/                # SDK authentication adapter
│   ├── authz/               # authorization helpers
│   ├── config/              # lint and TypeScript configuration
│   ├── forms/               # form controls
│   ├── logger/              # structured logging
│   ├── navigation/          # navigation components
│   ├── query/               # query and SSR integration
│   ├── server/              # server helpers
│   ├── test-utils/          # test setup and rendering
│   ├── ui/                  # UI components and theme
│   ├── utils/               # shared utilities
│   ├── valkey/              # Redis/Valkey adapters
│   └── wallow/              # Wallow client adapters
└── docs/
```

See [development](docs/development.md) for module ownership and package import rules, and [testing](docs/testing.md) for checks to run before pushing. Domain terms live in [CONTEXT.md](CONTEXT.md).
