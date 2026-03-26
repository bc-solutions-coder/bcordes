# Spec-to-Beads Skill Implementation Plan

> **For agentic workers:** This is a single skill file. Implement directly — no subagent dispatch needed.

**Goal:** Create a global Claude Code skill at `~/.claude/skills/spec-to-beads/SKILL.md` that decomposes design specs into agile bead hierarchies.

**Architecture:** Single SKILL.md file with YAML frontmatter, process flowchart, embedded beads CLI reference, and example output format.

**Tech Stack:** Claude Code skill (markdown with YAML frontmatter)

---

### Task 1: Create the skill directory and SKILL.md

**Files:**

- Create: `~/.claude/skills/spec-to-beads/SKILL.md`

- [ ] **Step 1: Create directory**

```bash
mkdir -p ~/.claude/skills/spec-to-beads
```

- [ ] **Step 2: Write SKILL.md**

The skill file must contain these sections in order:

1. **YAML frontmatter** — `name: spec-to-beads`, description starting with "Use when..." focusing on triggering conditions only (no workflow summary per CSO rules)

2. **Overview** — 2 sentences: what the skill does and core principle (spec context flows into every bead)

3. **Usage** — `/spec-to-beads <path-or-@file>`

4. **Process flowchart** — graphviz dot showing:
   - Read spec → Analyze → Present breakdown + dependency tree → User approves? → (no: revise, yes: create beads) → Verify cycles? → (yes: report + fix, no: print summary)

5. **Agile Hierarchy** — Epic/Feature/Task definitions with parent/child rules. Include the small-spec rule (skip feature layer if only one logical area).

6. **Analysis Rules** — How to extract beads from a spec:
   - Epic title = spec's top-level heading/purpose
   - Features = major sections/capabilities
   - Tasks = individual implementable items
   - Dependencies: inferred from logical ordering + explicit mentions in spec

7. **Dependency Tree Format** — The text tree format with example showing hierarchy + `⛓ depends on:` markers. Include no-dependency case.

8. **Description Richness** — What goes into each bead type:
   - Epic: `--description` (overview), `--design` (architecture/constraints)
   - Feature: `--description` (what/why), `--design` (relevant spec section)
   - Task: `--description` (actionable instruction), `--acceptance` (criteria), `--notes` (parent context)

9. **Beads CLI Reference** — Compact reference covering:
   - Creating: `bd create` with all relevant flags, valid types list
   - Dependencies: `bd dep add` with argument order warning, `bd dep --blocks` alternative, `bd dep tree --direction=both`, `bd dep cycles`
   - Hierarchy: `--parent`, `bd children`, `bd epic status`
   - Verification: `bd show`, `bd update` with named flags, `bd list -s open` with blocked note
   - Priority mapping: P0-P4
   - Constraints: no `bd edit`, use `--description`/`--design`/`--acceptance`

10. **Creation Order** — Sequential steps:
    1. Create epic (need ID)
    2. Create features with `--parent=<epic-id>` (parallel via subagents if 3+)
    3. Create tasks with `--parent=<feature-id>` (parallel per feature)
    4. Add dependencies with `bd dep add`
    5. Run `bd dep cycles`, report and fix if found
    6. Verify with `bd dep tree` and `bd children`

11. **Parallel Creation** — When to use subagents: spawn one per feature after epic exists, each creates feature + its tasks, returns title→ID mapping, orchestrator adds dependencies after all return.

12. **Edge Cases** — Single-feature spec, no dependencies, cycles detected, large specs (5+ features).

- [ ] **Step 3: Verify the skill is discoverable**

```bash
# Start a new Claude Code session and check if spec-to-beads appears in available skills
```

- [ ] **Step 4: Commit**

```bash
git add ~/.claude/skills/spec-to-beads/SKILL.md
git commit -m "feat: add spec-to-beads global skill"
```
