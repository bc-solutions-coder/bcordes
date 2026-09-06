# Domain docs

## Layout

Use a single context for this repository: `CONTEXT.md` and `docs/adr/` at the repository root. This covers `apps/web` and its shared `packages/*` libraries.

## Before exploring

Read root `CONTEXT.md` and any ADRs in `docs/adr/` relevant to the area you are changing.

If these files do not exist, proceed silently. Do not flag their absence or suggest creating them upfront. The `domain-modeling` skill creates them when domain terms or architectural decisions are resolved.

## Vocabulary

Use the terms defined in `CONTEXT.md` when naming domain concepts in issues, proposals, hypotheses, and tests. Respect any synonyms the glossary explicitly avoids.

If a needed concept is missing, check whether it belongs to the domain. Record real vocabulary gaps through `domain-modeling`.

## Decision conflicts

If a proposal contradicts an ADR, identify the ADR and explain why the decision should be reconsidered. Make the conflict explicit before changing the documented approach.
