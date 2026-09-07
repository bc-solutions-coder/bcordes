# Direct dependency audit, #60 and #74

This inventory covers repository source strings and imports (including dynamic
imports and require), CSS imports, workspace exports/manifests, scripts, CI
and configuration. An AST-based source scan and repository search were followed
by installed dependency-graph inspection. The application, test, Storybook and isolated production container checks
passed after removal.

## Removed direct dependencies

| Direct dependency                                                         | Evidence and retained ownership                                                                                      |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| h3                                                                        | No app/server import; only an obsolete direct-installation test and HTML h3 selectors. Nitro owns its h3 dependency. |
| @tanstack/react-table                                                     | No source, runtime loader, export or command uses Table.                                                             |
| @tanstack/match-sorter-utils                                              | No source, runtime loader, export or command uses the utility.                                                       |
| @tanstack/react-store, @tanstack/store                                    | No direct consumers. Router owns its compatible transitive Store versions.                                           |
| @tanstack/router-plugin                                                   | App config imports the plugin from Start. Start owns router-plugin transitively.                                     |
| @tanstack/devtools-event-client                                           | No direct consumer. React Devtools owns the event client transitively.                                               |
| cmdk, input-otp, react-day-picker, react-resizable-panels, recharts, vaul | No source imports or exported components reference these leftover UI libraries; UI uses Base UI.                     |
| @faker-js/faker                                                           | No fixtures, tests, scripts or runtime imports use Faker.                                                            |
| @types/pg                                                                 | No PostgreSQL app imports or type references. SDK dependencies retain their own declarations.                        |
| baseline-browser-mapping                                                  | No direct CLI or config use. Build tooling retains its transitive mapping dependency.                                |

React, React DOM, their ambient type packages, Node types, Tailwind and
Storybook remain: their runtime, CSS, compiler or CLI use is explicit. The
private SDK and api-errors versions remain unchanged. No package redesign or
application behavior change is included.

The h3-resolution suite asserts the retired direct h3 installation contract.
Its source/config-shape and resolution assertions no longer protect the SDK
server boundary. That obsolete suite was removed as coordinated with #46/#70;
retain production and browser checks for authentication, sessions, inquiries,
notifications and Valkey.

## Remaining TanStack updates

Query/Query Devtools 5.102.8 and routing were upgraded in #58. The only remaining
used direct package is React Devtools, updated to compatible 0.10.12. Table
and Store API migrations are unnecessary because those direct dependencies
have no application consumers. Framework-owned transitive packages retain
the versions required by their owners.

## Verification

All 1290 tests in 119 files pass with coverage; the seven removed cases are
exactly the retired h3-resolution suite. Coverage configuration and thresholds
are unchanged. Lint, every workspace typecheck, application build/smoke, all
24 production browser tests, Storybook build and Docker runtime verification
under both redirect configurations pass. Updated Devtools opens and switches
to its Query panel without page errors. Both review axes found no issues.

Remaining direct TanStack versions: react-devtools 0.10.12, react-query and
react-query-devtools 5.102.8, react-router 1.170.33, react-router-devtools 1.167.1,
react-router-ssr-query 1.167.2 and react-start 1.168.50. Router owns Store 0.9.3;
Start owns router-plugin 1.168.36. No unused Table/Store APIs were introduced
merely to retain their direct declarations.
