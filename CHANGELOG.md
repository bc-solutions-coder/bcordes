# Changelog

## [0.1.3](https://github.com/bc-solutions-coder/bcordes/compare/bcordes-v0.1.2...bcordes-v0.1.3) (2026-03-26)


### Features

* add pino structured logging with color-coded HTTP method output ([a51fa3a](https://github.com/bc-solutions-coder/bcordes/commit/a51fa3a1b31fb25b076884529742bec290258056))
* add root-level error boundary with retry and go-home actions ([0718745](https://github.com/bc-solutions-coder/bcordes/commit/0718745d842e002a1a627fedb522e263b4a8e7e0))
* **auth:** add CSRF token generation to session creation ([4dbd138](https://github.com/bc-solutions-coder/bcordes/commit/4dbd1380eecef1961161caa68b9fc73227653354))
* **auth:** add CSRF token server function and validation middleware ([b33b1d7](https://github.com/bc-solutions-coder/bcordes/commit/b33b1d7345dab5e5c22cea1e4be32e35a4c4dc92))
* **dx:** DX improvements round 2 — fix pino-pretty crash, move misplaced deps, remove dead blog code, fix 25 broken tests, add per-route SEO, add typecheck script ([65c65aa](https://github.com/bc-solutions-coder/bcordes/commit/65c65aabdfe3467b3bd26eafbfbc6f99b9f08499))
* **notifications:** full notifications integration with center page, settings, push, and real-time enhancements ([925d0cd](https://github.com/bc-solutions-coder/bcordes/commit/925d0cdbfbf8dfe532787f694472ed7a830584c7))
* **scaling:** replace in-memory state with Valkey for horizontal scaling ([8e19bec](https://github.com/bc-solutions-coder/bcordes/commit/8e19bec57ffd6824c06fbcbdfbcd3bd35e0c5d23))
* **security:** add COOP and COEP headers for cross-origin isolation ([5d67732](https://github.com/bc-solutions-coder/bcordes/commit/5d67732d2d2fa36a33e1b296910b05d134f1be72))
* **security:** security hardening — headers, auth guards, input validation, error sanitization, SSE hardening, Docker non-root ([79344d4](https://github.com/bc-solutions-coder/bcordes/commit/79344d4665cde83ea68045839da5189ad4fa2eba))
* **testing:** comprehensive unit and E2E test coverage ([f661f92](https://github.com/bc-solutions-coder/bcordes/commit/f661f926f216c54e32ba2fbec4ced1e06961841d))
* wire up web-vitals reporting with dev console logging ([9a519b2](https://github.com/bc-solutions-coder/bcordes/commit/9a519b2b6bdbb85760a4263ea5bd2ed881d87c9b))


### Bug Fixes

* address code review findings from DX improvements ([f6aacc5](https://github.com/bc-solutions-coder/bcordes/commit/f6aacc5b46cb9218c19c0112cbdd86774ed7592b))
* **auth:** use timing-safe comparison for OAuth state parameter ([3475487](https://github.com/bc-solutions-coder/bcordes/commit/347548725b2b319217cf3a6f919a03c9ba640ff3))
* **contact:** use correct useUser destructuring for email auto-fill ([57fce24](https://github.com/bc-solutions-coder/bcordes/commit/57fce2473fb778a9cae8cc46e122c470ac002574))
* **deps:** pin seroval &gt;=1.4.1 to resolve high-severity CVEs ([bc29d1b](https://github.com/bc-solutions-coder/bcordes/commit/bc29d1bc795c0432d772d978d61721e19ff79721))
* drop isomorphic-dompurify to avoid 10MB jsdom bundle in server chunk ([2752c43](https://github.com/bc-solutions-coder/bcordes/commit/2752c43066ac3c2268d4ad58fee71d4493547b52))
* SSE event stream singleton connection with proper leader election ([f31e561](https://github.com/bc-solutions-coder/bcordes/commit/f31e561d5e1cdf6dc20accf625b139e8494415e5))
* SSE upstream fixes — auth guard, PascalCase normalization, redirect handling ([3fa6149](https://github.com/bc-solutions-coder/bcordes/commit/3fa614989e42f3d18bb96cc67c88cff8a1c5475d))
* **sse:** add 30s keepalive heartbeat to prevent undici body timeout ([05d0096](https://github.com/bc-solutions-coder/bcordes/commit/05d0096b71cea9fc8799e00a22296370c1a71071))
* **wallow:** add 401 retry with token refresh to service client ([b19631f](https://github.com/bc-solutions-coder/bcordes/commit/b19631fc7768442a677a529c7d31f1810fec3fe5))

## [0.1.2](https://github.com/bc-solutions-coder/bcordes/compare/bcordes-v0.1.1...bcordes-v0.1.2) (2026-03-23)

### Bug Fixes

- add Nitro plugin and fix Docker server entrypoint ([3dba4a8](https://github.com/bc-solutions-coder/bcordes/commit/3dba4a8dea7352ab4fd148d4cef8576fe90bf3c1))

## [0.1.1](https://github.com/bc-solutions-coder/bcordes/compare/bcordes-v0.1.0...bcordes-v0.1.1) (2026-03-23)

### Features

- production readiness - cleanup, notifications, URL fixes ([c1522d8](https://github.com/bc-solutions-coder/bcordes/commit/c1522d89d3968893e0abe29051bc023b56fdcf5a))

### Bug Fixes

- add linux/arm64 platform support for Docker builds ([c85b2c1](https://github.com/bc-solutions-coder/bcordes/commit/c85b2c1d50f63d87a8f0d2a1432d4084d4639b41))
- pin TanStack router/start versions to prevent invariant import error ([2261eda](https://github.com/bc-solutions-coder/bcordes/commit/2261eda28b3d3ee2c53b43dadcfe0e8c22ee18de))

## 0.1.0 (2026-03-21)

### Features

- initial release ([5848c88](https://github.com/bc-solutions-coder/bcordes/commit/5848c88ab8b67dd28227429324d51ccf7c693f97))
