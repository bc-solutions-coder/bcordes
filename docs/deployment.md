# Deployment

Production release remains subject to the [Wallow release gates](https://github.com/bc-solutions-coder/bcordes/issues/31). Browser push requires a corrected delivery and authorization contract. Preferences, inquiry live updates, and verified-email historical linking also need platform verification. Passing local tests does not clear these gates.

## Register the application

Use the existing Wallow deployment. Create a bcordes organization and a confidential developer application bound to it. For the default hostname, register:

- Callback: `https://bcordes.dev/bff/callback`
- Post-logout redirect: `https://bcordes.dev/`
- Back-channel logout: `https://bcordes.dev/bff/backchannel-logout`

Approve the profile, inquiry, and notification scopes listed in [configuration](configuration.md). Give customers ordinary customer membership. Staff need the platform permissions that expand to `InquiriesRead`. Requested scopes and self-service signup do not grant staff access.

Create a separate service account with only the approved inquiry-submission grant for anonymous contact submissions. Signed-in submissions use the user's SDK session. Expired authenticated submissions must sign in again; they must not fall back to service credentials.

Read the deployed discovery document before choosing the issuer. Verify that its issuer matches `OIDC_ISSUER` exactly and that the application server can reach its advertised token, JWKS, and userinfo endpoints. The available deployment guidance does not establish which public Wallow issuer is correct for the target installation.

## Configure Dockhand and networking

Import [docker-compose.prod.yml](../docker-compose.prod.yml) into Dockhand and supply its inputs through the managed stack environment. Use [configuration](configuration.md#compose-inputs-and-fixed-settings) for required values, defaults, and settings fixed by Compose. Configure GHCR pull credentials if the image is private.

Pin a tested image digest such as `ghcr.io/bc-solutions-coder/bcordes@sha256:...`, or a full `sha-<commit>` tag. Keep a known-good digest and compatible configuration for rollback. Mutable `nightly` tags are unsuitable rollback references.

The web container joins the external `wallow_wallow` network under alias `bcordes-web`. Confirm that the deployed Wallow API uses the expected `wallow-api:8080` address. Valkey joins only the private session network under alias `bcordes-session-store`. Neither container publishes host ports.

The Compose labels configure the `bcordes` Pangolin resource to target `bcordes-web:3000`. Verify that the existing Newt instance discovers those labels and that DNS, TLS, and the public resource are configured for the chosen domain. A staging stack needs distinct Pangolin resource labels, a distinct web network alias, and a distinct BFF app ID. Changing only the domain is insufficient.

Keep cookie keys stable and preserve the named Valkey volume across updates. Credential rotation or incompatible session formats can require users to sign in again. There is no legacy-session bridge. Do not remove the volume during routine redeployment.

## Build and verify an image

Export `NODE_AUTH_TOKEN` with read access to both private packages, then run:

```sh
bash scripts/verify-docker.sh
```

The [verifier](../scripts/verify-docker.sh) builds the image using a BuildKit secret, starts disposable Valkey, and pins the built image ID and checks direct health readiness, route-specific public HTML and sampled assets under two callback/logout URL configurations. Requests use the published loopback address. Health requests are limited to two seconds within an overall 30-second deadline. It removes its containers and network afterward. It does not verify live Wallow login or authorization.

To build an image without running that verifier:

```sh
docker build --secret id=node_auth_token,env=NODE_AUTH_TOKEN -t bcordes:verify .
```

The runtime stage contains Nitro output and receives secrets at startup. The install token is not a runtime input. See [testing](testing.md) for application checks before building.

## Release and verify

The [Deploy Nightly workflow](../.github/workflows/deploy.yml) publishes `nightly` and full commit tags after successful main-branch CI. It posts a `deploy-ready` status to an open release PR, but does not update Dockhand or verify the running deployment. That status alone is not release approval.

Select the tested image in Dockhand and redeploy with the matching configuration. Then check:

- Pangolin resource discovery, DNS, TLS, public HTML, and assets.
- `/api/health`, which returns 200 only after a successful Valkey ping. It does not prove discovery, login, or feature authorization.
- Customer enrollment, callback, current user, own inquiries, and comments. Confirm denial of cross-customer access, internal comments, and staff-only status operations.
- Staff access, anonymous contact submission, preferences, actual browser push delivery, and SSE recovery against the corrected platform release.
- Token refresh, logout, back-channel revocation, and organization-scoped historical linking.
- App restart with a valid SDK session and the existing Valkey volume.

Record the image digest, configuration names, SDK and platform versions, and verification results in the release issue. Do not record secret values. Keep the Wallow release gate open until its platform-dependent checks pass.

If verification fails, redeploy the known-good image with its compatible configuration and repeat the checks. Rolling back across incompatible authentication formats may require another sign-in.

## Docker dependency caching

The dependency stage copies only root/workspace manifests, the lockfile and
registry configuration. Add a corresponding manifest COPY when adding a
workspace package. Source files enter the builder after installation, and
the builder inherits the dependency stage's Node/pnpm setup.

PR validation and publication share the `bcordes-docker` BuildKit cache scope
with mode=max exports. A cached dependency layer includes the installed
node_modules; the pnpm store cache mount only accelerates reinstalls when that
builder retains it. GitHub's layer cache does not itself persist the cache
mount onto a fresh runner. Source changes should reuse installation; manifest
or lockfile changes must invalidate it. Registry credentials remain a BuildKit
secret read through a temporary config in the install step.

## Reusing the PR image

PR Docker validation builds one native linux/amd64 image, tagged with the
workflow revision, and passes its Docker archive to the runtime job. That job
loads the archive and invokes `verify-docker.sh --image <local-image>` without
rebuilding or requiring a registry token. The build and runtime job names remain
unchanged. A manual workflow trigger supports checking this same path and its
cache behavior without publishing an image.

Without `--image`, local verification still builds and checks an image and
requires NODE_AUTH_TOKEN. Publication remains gated on successful CI and builds
both linux/amd64 and linux/arm64. Release promotion still resolves the released
revision's SHA tag to a digest; nightly is not a substitute for that revision.
