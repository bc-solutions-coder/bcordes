# Integrated migration verification, #77

Engineering validation passed at `7d68a6378629b8c6b8e6d7057c2344e7a7481af5`.
Final rollback/release acceptance remains open: the currently deployed Dockhand
image is unconfirmed, and actual semver promotion must be checked on the next
approved release. These unavailable checks are not recorded as passes. #52 and
#77 remain open for that handoff.

## Clean integrated checks

A fresh detached worktree started without node_modules. Installation used the
frozen lockfile and the existing authenticated pnpm store. Docker layers and the
local Chromium installation were warm; this is a clean dependency tree, not a
cold-network benchmark. Node was 24.11.1, pnpm 11.26.0, on macOS arm64.
[Command records](final-commands.json) retain all 13 commands, timestamps, elapsed
times and exit codes.

- Frozen install, formatting, native typed lint plus JS plugins, recursive
  compiler selection/typecheck and peer checks pass. All 14 non-root workspaces
  select TypeScript 7.0.2; no stale compiler shim or TS6 fallback remains.
- All 120 Vitest files pass: 1,269 tests pass and 19 checks requiring the private,
  untracked CLAUDE.md are skipped. Those local documentation checks pass in the
  existing main checkout, producing its 1,288-test count. No skip is a pass.
- [Coverage](final-coverage.json) remains 83.24% statements, 75.74% branches,
  84.19% functions and 84.32% lines on the same 102 source paths. No exclusions or
  thresholds changed; the meaningful 90% target remains #46.
- Production build, public HTML/asset smoke, all 24 Chromium tests and static
  Storybook build pass. Native Linux arm64 Docker build/runtime checks pass for
  both redirect-domain configurations. No live Wallow/platform rollout is implied.
- [Representative UI checks](final-visual.json) pass: desktop contact values,
  390px responsive layout without overflow, navigation dialog open/Escape close,
  and destructive/disabled Storybook Button arguments. Screenshots were inspected;
  the theme token remains `oklch(39% .11 142)` and there were no browser page errors.

## Versions and compatibility

[Resolved versions](final-versions.json) retain all 15 workspace inventories.
The principal versions are:

| Component                        | Version                       |
| -------------------------------- | ----------------------------- |
| Node requirement / pnpm          | Node 24 / 11.26.0             |
| TypeScript                       | 7.0.2                         |
| Oxlint / tsgolint / Oxfmt        | 1.82.0 / 7.0.2001 / 0.67.0    |
| Vite / React plugin              | 8.2.2 / 6.1.1                 |
| Vitest / coverage-v8             | 5.0.0 / 5.0.0                 |
| React / React DOM                | 19.2.8 / 19.2.8               |
| Tailwind / Vite integration      | 4.3.3 / 4.3.3                 |
| Storybook / React Vite framework | Exact 11.0.0-alpha.0          |
| Nitro                            | Exact 3.0.260903-beta         |
| TanStack Start / Router / Query  | 1.168.50 / 1.170.33 / 5.102.8 |
| Private SDK / API errors         | Unchanged 2.0.0 / 1.0.0       |

Storybook and Nitro are the explicit prerelease exceptions. The user separately
approved Oxlint's alpha JS plugin API and the custom syntax-only naming rule.
The [74-rule inventory](lint-migration.md) records mappings, options, scopes and
behavior probes. ESLint remains only as an upstream plugin peer. Oxfmt's extra
sorting stays disabled. Storybook's active react-docgen path works with TS7.
Exact release-age exceptions remain in pnpm-workspace.yaml; the default policy
has not been disabled. No incompatible peer dependencies are reported.

The [dependency-removal inventory](dependency-removals.md) records unused direct
libraries and retained framework-owned transitive dependencies. No private SDK
upgrade, React Compiler activation, new package build layer or product redesign
was introduced.

## CI, architectures and release promotion

[CI run 34148731668](https://github.com/bc-solutions-coder/bcordes/actions/runs/34148731668)
succeeded for the integrated revision.
[Publication run 34148882112](https://github.com/bc-solutions-coder/bcordes/actions/runs/34148882112)
succeeded afterward. The registry manifest was inspected directly and contains
both linux/amd64 and linux/arm64 images. The immutable published index is:

```text
ghcr.io/bc-solutions-coder/bcordes@sha256:f313af846dc7b4ea9c3870cc1d1ca6900e2aa55c542e2cf3c7a88d1c31584d98
```

[Publication evidence](final-publication.json) retains the per-platform digests.
An earlier publication attempt for this revision was cancelled and is not counted
as a pass. The successful replacement is the run cited above. Publication proves
registry availability, not that Dockhand selected or ran the image.

The final audit corrected the pre-existing Release Please path-output mismatch
in #86. The workflow now receives the released apps/web tag, checks out that tag,
resolves its full SHA image to a digest and promotes that immutable source. There
is no nightly fallback. Syntax/expression checks and the existing semver behavior
tests pass; actual semver-tag promotion is still pending an approved release.
Release PR #84 has not been merged by this migration.

## Performance and cache decision

The [performance report](performance.md) records an observed PR median decrease
from 405 to 110 seconds and CI-to-publication decrease from 579 to 174 seconds.
The small, observational sample exceeds the 25% target but does not establish a
controlled five-run or cold-cache comparison. It retains the 919-second outlier.
Queue/scheduling delay, execution spans and cache observations are separate.

[Dependency-layer experiments](docker-cache-results.json) verify source reuse
and manifest/lockfile invalidation on fresh builders. [PR archive evidence](docker-ci-results.json)
verifies building once and loading that image in the runtime job. No extra task
cache was added: short build/type/lint steps are off the usual test critical path,
and realistic cross-PR test-cache hit rates have not been established. No gate
or publication side effect is cached away.

## Rollback and remaining acceptance

Before a production change, record the image digest actually selected in Dockhand
and its matching runtime configuration. That reference was requested during this
verification and is still unavailable. Do not substitute a mutable nightly tag
or assume the latest GitHub release is deployed.

The published SHA image for the previous GitHub release v0.1.8 was verified:

```text
ghcr.io/bc-solutions-coder/bcordes@sha256:ed19541d10488f46b773acb5c542cebebb56dc2069d8f464169bdadc66e0c513
```

This is a published source-image candidate, not a confirmed production rollback
reference. Its semver image tag was absent because the pre-existing promotion job
was skipped. No old tags or latest image pointer were backfilled.

For runtime rollback, select the confirmed prior digest in Dockhand with its
compatible configuration, then repeat health, public-page/asset and applicable
Wallow release checks from [deployment guidance](../../deployment.md). Retain
Valkey/session compatibility; this migration did not change the private SDK or
introduce data migrations.

For source rollback, prepare a reviewed revert of the relevant migration slices
in reverse dependency order, restoring configuration and lockfile together.
Keep coupled Vite/TanStack/Nitro/React and test-tooling changes together. The green
pre-upgrade revision `204e9c4` is a reference for the old toolchain, not permission
to discard unrelated later changes. Rerun the complete clean acceptance matrix
before publishing the reverted artifact.

Remaining #77 acceptance: confirm the deployed production digest and record an
actual approved semver promotion. Engineering artifacts and measurement evidence
are committed separately from unrelated test-review documents.
