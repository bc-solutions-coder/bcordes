# Migration performance measurement

Evidence for [#61](https://github.com/bc-solutions-coder/bcordes/issues/61).
The application and workflow revision under measurement is `366b5ed`.
This documentation PR changes neither application code nor workflow commands.

## Sample definitions

Measure three current PR attempts at the same documentation revision, pairing CI
and Docker validation by revision and attempt. Include the deploy-gate job when
calculating observed completion. Keep conclusions for every selected attempt;
a skipped or failed check is not passing evidence. This measures automated checks,
not human review or merge time.

Measure three main CI/publication pairs at the integrated application revision.
The first is the original push; the next two repeat the same CI run. Each
publication must complete before another main CI repetition starts. Publication
is image availability, not proof of an external production rollout.

The historical baseline remains in [the baseline report](README.md). It has
four matched PR samples, only two of which used the recent workflow. Its source
revisions differ from the upgraded sample and some runs include rerun waiting.
Report this mismatch rather than claiming a controlled before/after trial.

Separate elapsed attempts, initial scheduling delay and execution spans. Inspect
cache restoration and BuildKit reuse in logs; do not infer a cold cache from the
absence of a hit. The existing [Docker cache experiments](docker-cache-results.json)
provide controlled dependency-layer invalidation evidence; no shared caches are
cleared for this measurement.

## Known outlier

The initial upgraded CI run
[34145664547](https://github.com/bc-solutions-coder/bcordes/actions/runs/34145664547)
spent 559 seconds in Chromium installation. The log records 537 seconds fetching
21.1 MB of Ubuntu font dependencies. The app build took six seconds. Retain this
run in the sample; a JavaScript task-output cache does not solve that network
bottleneck.

## Decision criteria

Target at least 25% lower median PR completion time, while reporting sample sizes,
workflow differences and any shortfall. Evaluate remaining repeated work after
Docker reuse. Do not add package compilation layers just to produce cacheable
outputs, cache publication side effects, or skip quality gates. Turbo or another
task cache needs measured benefits that justify its inputs, outputs, environment
keys and invalidation complexity.
