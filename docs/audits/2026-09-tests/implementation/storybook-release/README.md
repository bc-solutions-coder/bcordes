# Built Storybook and release outputs — #102

Implements [#102](https://github.com/bc-solutions-coder/bcordes/issues/102) at implementation revision `74cb966` from base `111283b`, following the [accepted source-guard review](../../reviews/app-migration-source-guards/README.md). [Dispositions](dispositions.tsv) map the three owned original behavior cases. [Resources](resources.tsv) records the shared script, standalone tests, runtime probe and command/workflow entrypoints.

`pnpm verify:storybook` serves the actual static Storybook build on an ephemeral loopback port, locates UI/Button Default through the emitted index, opens its iframe in Chromium, and requires a visible, enabled Button that accepts focus on click. Browser and preview server close on success or failure. This exercises one package story; detailed UI interactions and appearance remain owned by #100. CI preserves compilation and invokes the runtime check afterward.

The release workflow calls `scripts/release-tag-outputs.sh` with its tag input. The transformation is extracted unchanged. Two Node-runner cases execute that script with a temporary GITHUB_OUTPUT file and assert exact version, major and minor output for v0.1.7 and v1.10.2. They run through `pnpm test:verification`. Neither releases nor malformed-tag policy are added. The old two YAML-parsing tests and their helper were removed here because workflow extraction makes them obsolete; remaining mixed source guards await #103.

Removing the package story from the emitted index failed discovery. Building the Default story with a disabled Button failed usability. Retaining the tag prefix and truncating the multi-digit minor value each failed the output tests. All four deliberate defects were restored; the real Storybook build/runtime and all 29 standalone cases pass. The initial output tests also failed when the shared script did not yet exist.

Full coverage and final review results are recorded in [summary](summary.json). Coverage thresholds and exclusions remain unchanged. No remote publication or live-auth behavior is claimed.
