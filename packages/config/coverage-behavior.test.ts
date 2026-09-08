import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { copyWorkspace, runTool } from './testing/workspace'

function branchCounts(report: string, suffix: string) {
  const record = report
    .split('end_of_record')
    .find((entry) =>
      entry
        .split('\n')
        .some((line) => line.startsWith('SF:') && line.endsWith(suffix)),
    )
  if (!record) throw new Error(`Missing executed coverage for ${suffix}`)
  const counts = Object.fromEntries(
    record
      .trim()
      .split('\n')
      .map((line) => line.split(':')),
  )
  const total = Number(counts.BRF),
    covered = Number(counts.BRH)
  if (
    !Number.isSafeInteger(total) ||
    !Number.isSafeInteger(covered) ||
    total <= 0
  )
    throw new Error(`Missing branch counters for ${suffix}`)
  return { total, covered }
}

it(
  'emits coverage for executed app and package code and rejects uncovered behavior at the configured thresholds',
  { timeout: 60_000 },
  () => {
    const workspace = copyWorkspace()
    try {
      for (const member of workspace.packages) {
        if (member.path !== 'packages/config')
          rmSync(join(workspace.directory, member.path), {
            recursive: true,
            force: true,
          })
      }
      const directory = join(workspace.directory, 'packages/config')
      for (const file of readdirSync(directory)) {
        if (file.endsWith('.test.ts')) rmSync(join(directory, file))
      }
      const probes = [
        'packages/config/src/coverage-probe.ts',
        'apps/coverage-fixture/src/coverage-probe.ts',
      ]
      for (const probe of probes) {
        const source = join(workspace.directory, probe)
        mkdirSync(join(source, '..'), { recursive: true })
        writeFileSync(
          source,
          `export function greeting(known: boolean) {
  if (known) return 'Welcome back'
  return 'Welcome'
}
`,
        )
      }
      const test = join(directory, 'coverage-probe.test.ts')
      const covered =
        "import { expect, it } from 'vitest'\nimport { greeting } from './src/coverage-probe'\nimport { greeting as appGreeting } from '../../apps/coverage-fixture/src/coverage-probe'\nit('welcomes returning visitors', () => { expect(greeting(true)).toBe('Welcome back'); expect(appGreeting(true)).toBe('Welcome back') })\n"
      writeFileSync(test, covered)
      const partial = runTool(workspace.directory, 'pnpm', [
        'exec',
        'vitest',
        'run',
        '--coverage',
      ])
      expect(partial.status, partial.stdout + partial.stderr).toBe(1)
      expect(partial.stdout + partial.stderr).toContain(
        'does not meet global threshold',
      )
      const report = join(workspace.directory, 'coverage/lcov.info')
      for (const probe of probes) {
        const counts = branchCounts(readFileSync(report, 'utf8'), probe)
        expect(counts.covered).toBeGreaterThan(0)
        expect(counts.covered).toBeLessThan(counts.total)
      }
      writeFileSync(
        test,
        covered +
          "it('welcomes new visitors', () => { expect(greeting(false)).toBe('Welcome'); expect(appGreeting(false)).toBe('Welcome') })\n",
      )
      const complete = runTool(workspace.directory, 'pnpm', [
        'exec',
        'vitest',
        'run',
        '--coverage',
      ])
      expect(complete.status, complete.stdout + complete.stderr).toBe(0)
      for (const probe of probes) {
        const counts = branchCounts(readFileSync(report, 'utf8'), probe)
        expect(counts.covered).toBe(counts.total)
      }
    } finally {
      workspace.dispose()
    }
  },
)
