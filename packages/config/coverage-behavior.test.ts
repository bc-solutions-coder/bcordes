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

it(
  'emits coverage for executed code and rejects uncovered behavior at the configured thresholds',
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
      mkdirSync(join(directory, 'src'), { recursive: true })
      writeFileSync(
        join(directory, 'src/coverage-probe.ts'),
        `export function greeting(known: boolean) {
  if (known) return 'Welcome back'
  return 'Welcome'
}
`,
      )
      const test = join(directory, 'coverage-probe.test.ts')
      const covered =
        "import { expect, it } from 'vitest'\nimport { greeting } from './src/coverage-probe'\nit('welcomes returning visitors', () => expect(greeting(true)).toBe('Welcome back'))\n"
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
      expect(readFileSync(report, 'utf8')).toContain('src/coverage-probe.ts')
      writeFileSync(
        test,
        covered +
          "it('welcomes new visitors', () => expect(greeting(false)).toBe('Welcome'))\n",
      )
      const complete = runTool(workspace.directory, 'pnpm', [
        'exec',
        'vitest',
        'run',
        '--coverage',
      ])
      expect(complete.status, complete.stdout + complete.stderr).toBe(0)
      expect(readFileSync(report, 'utf8')).toContain('src/coverage-probe.ts')
    } finally {
      workspace.dispose()
    }
  },
)
