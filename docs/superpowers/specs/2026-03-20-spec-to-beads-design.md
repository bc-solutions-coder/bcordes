# Spec-to-Beads Skill — Design Spec

## Overview

A global Claude Code skill (`~/.claude/skills/spec-to-beads/`) that reads a design/implementation spec and breaks it down into a structured agile hierarchy of beads (epic → features → tasks) with proper parent/child relationships and dependency graphs.

## Problem

Design specs contain all the information needed to plan work, but manually creating beads from them is tedious and error-prone. Agents working on beads need self-contained descriptions with enough context to execute without reading the full spec. This skill automates the decomposition and ensures spec context flows into each bead.

## Trigger

- `/spec-to-beads <path-or-@file>`
- User asks to break down a spec/design doc into beads

## Input

A single spec file — either a file path or `@`-referenced file.

## Flow

```
1. Read the spec file
2. Analyze: extract epic, features, and tasks
3. Present structured breakdown (titles + one-line summaries)
4. Present text dependency tree for approval
5. User approves or requests changes
6. On approval: create all beads (epic → features → tasks → dependencies)
7. Verify: run bd dep cycles to check for circular dependencies
   - If cycles found: report affected IDs, prompt user for correction, fix before continuing
8. Print summary with bead IDs and final dependency tree
```

## Agile Hierarchy

- **Epic** = the whole spec's goal (e.g., "Website Redesign")
- **Feature** = a major capability or section within the epic (e.g., "Bento Grid Showcases")
- **Task** = an individual implementable work item under a feature (e.g., "Build expand-on-click card interaction")

Parent/child relationships:
- Features are children of the epic (`--parent=<epic-id>`)
- Tasks are children of their feature (`--parent=<feature-id>`)

**Small specs:** If the spec has only one logical area of work (a single feature), attach tasks directly to the epic. Don't create an artificial feature layer just for hierarchy's sake.

## Dependency Tree Format

Text-based tree shown before creation for approval:

```
EPIC: Website Redesign [P2]
├── FEATURE: Global Layout & Theme
│   ├── TASK: Define CSS custom properties and theme tokens
│   ├── TASK: Build sticky header component
│   └── TASK: Build footer component
├── FEATURE: Hero Section
│   ├── TASK: Create hero component with overline/headline/accent bar
│   └── TASK: Add responsive breakpoints
│       └── ⛓ depends on: Define CSS custom properties
├── FEATURE: Bento Grid Showcases
│   ├── TASK: Build bento grid layout
│   ├── TASK: Create expand-on-click card interaction
│   │   └── ⛓ depends on: Build bento grid layout
│   └── TASK: Add URL hash routing for direct card links
│       └── ⛓ depends on: Create expand-on-click card interaction
```

- Indentation shows parent/child hierarchy
- `⛓ depends on:` lines show cross-cutting dependencies (blocks/blocked-by)
- Dependencies are both inferred from logical ordering and extracted from explicit spec mentions
- **No dependencies?** If all tasks in a feature are independent, omit `⛓` markers. The dependency step still runs but creates no `bd dep add` calls.

## Description Richness

Each bead is self-contained — an agent should be able to pick it up and work without reading the full spec.

### Epic
- `--description`: Spec overview and purpose
- `--design`: Architectural decisions, key constraints, design principles
- `--priority`: Inferred from spec or default P2

### Feature
- `--description`: What this feature accomplishes and why
- `--design`: Relevant spec section — layout details, component behavior, patterns to follow
- `--priority`: Inherited from epic or adjusted if spec indicates urgency

### Task
- `--description`: Clear actionable instruction ("Build X that does Y using Z")
- `--acceptance`: Success criteria when the spec defines them
- `--notes`: Reference to parent feature for context
- `--priority`: Inherited from feature or adjusted

## Beads CLI Reference

The skill embeds knowledge of these commands:

### Creating
- `bd create --title="..." --description="..." --type=epic|feature|task --priority=N --parent=<id>`
- Valid types: `task`, `bug`, `feature`, `chore`, `epic`, `decision`
- `--design` flag for design context
- `--acceptance` flag for success criteria
- `--notes` flag for additional context

### Parallel Creation

To speed up bead creation, spawn one subagent per feature (after the epic exists). Each subagent receives:
- The feature title, description, and design content
- The epic ID (for `--parent`)
- The list of tasks under that feature with their descriptions

Each subagent creates its feature bead, then creates all child tasks, and returns the mapping of task titles → bead IDs. The orchestrator collects all IDs and then creates dependencies.

### Dependencies

**Argument order is critical — easy to get backwards:**
- `bd dep add <blocked-id> <blocker-id>` — "blocked depends on blocker" (first arg = the one waiting)
- `bd dep <blocker-id> --blocks <blocked-id>` — flag-based alternative (first arg = the one blocking)
- Both create the same relationship, but argument order is inverted. Pick one form and use it consistently.
- `bd dep tree <id>` — show dependency tree (defaults to `--direction=down`)
- `bd dep tree <id> --direction=both` — show full dependency context (recommended for verification)
- `bd dep cycles` — check for circular dependencies

### Hierarchy
- `--parent=<epic-id>` on features, `--parent=<feature-id>` on tasks
- `bd children <id>` — list children of a parent
- `bd epic status` — show completion status of all epics (no ID argument)

### Verification
- `bd show <id>` — verify a created bead
- `bd update <id> --title="..." --description="..." --priority=N` — fix fields post-creation (use named flags, not generic `--field=value`)
- `bd list -s open` — show open beads (note: beads with unmet dependencies show as `blocked`, not `open`)

### Priority Mapping
- P0 = critical, P1 = high, P2 = medium (default), P3 = low, P4 = backlog

### Constraints
- Never use `bd edit` (opens $EDITOR, blocks agents)
- Use `--description` and `--design` flags to push spec context into beads
- Use `--acceptance` for tasks with clear criteria from spec

## Creation Order

1. Create the epic first (need its ID for feature parents)
2. Create all features with `--parent=<epic-id>` (can be parallel via subagents)
3. Create all tasks with `--parent=<feature-id>` (can be parallel per feature)
4. Add dependencies with `bd dep add` (all beads must exist first)
5. Run `bd dep cycles` — if cycles found, report to user and prompt for correction
6. Verify with `bd dep tree <epic-id> --direction=both` and `bd children <epic-id>`

## User Interaction Points

1. **After analysis** — present breakdown + dependency tree, wait for approval
2. **On change requests** — adjust and re-present until approved
3. **After creation** — print summary with all bead IDs and final dependency tree

## Edge Cases

- **Single-feature spec:** Skip the feature layer, attach tasks directly to the epic
- **No dependencies:** Omit `⛓` markers from tree; skip `bd dep add` calls entirely
- **Dependency cycles detected:** Report affected bead IDs to user, prompt for which dependency to remove, fix before returning summary
- **Very large specs:** If the spec has 5+ features, still process in one pass but use parallel subagents for creation

## Non-Goals

- Does not execute or implement any beads
- Does not modify the spec file
- Does not create beads from inline/pasted content (file input only)
- Does not handle multiple spec files in one invocation
