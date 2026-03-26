# Changelog

## [0.1.3](https://github.com/bc-solutions-coder/bcordes/compare/bcordes-v0.1.2...bcordes-v0.1.3) (2026-03-26)


### Features

* **dx:** DX improvements — pino logging, web-vitals, error boundary, date-fns, gray-matter ([4279717](https://github.com/bc-solutions-coder/bcordes/commit/427971711bc448635f8f819ae5d014f964f40e8f))
* initial release with versioning setup ([535f223](https://github.com/bc-solutions-coder/bcordes/commit/535f223f90a5a69bea5d6e948b8594f587801f3a))
* **notifications:** full notifications integration with real-time ([f6de0d7](https://github.com/bc-solutions-coder/bcordes/commit/f6de0d77dd33a7b2c56d089a007c7add1e5ca8a2))
* **security:** security hardening — headers, auth guards, CSRF, CVE fixes ([514957b](https://github.com/bc-solutions-coder/bcordes/commit/514957bcad32ea3424a7175091e4f59c5a45a9a8))


### Bug Fixes

* **ci:** add eslint as explicit devDependency for CI compatibility ([4d1e447](https://github.com/bc-solutions-coder/bcordes/commit/4d1e44770a6c3d1d5b21d6d17cdb826baaad97f4))
* production readiness — Docker, version pins, Nitro plugin ([aa2bd31](https://github.com/bc-solutions-coder/bcordes/commit/aa2bd31cb071ccd5e51e2b28e025f3dba44c9ef0))
* SSE event stream — singleton leader election and upstream fixes ([b7764c1](https://github.com/bc-solutions-coder/bcordes/commit/b7764c1bb0a6740c5677badf00364abfb41fd5f7))
* **test:** mock useUser in tests that render EventStreamProvider ([8989400](https://github.com/bc-solutions-coder/bcordes/commit/89894002ebb01d02c0a1eb029e79bb6ee08d362c))

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
