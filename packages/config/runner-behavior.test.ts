import { readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { copyWorkspace, runTool } from './testing/workspace'

it(
  'executes every workspace project and provides the application alias, DOM matchers and cleanup',
  { timeout: 120_000 },
  () => {
    const workspace = copyWorkspace()
    try {
      for (const member of workspace.packages) {
        const directory = join(workspace.directory, member.path)
        for (const file of readdirSync(directory, {
          recursive: true,
          encoding: 'utf8',
        })) {
          if (
            !file.startsWith('node_modules/') &&
            /\.(test|spec)\.[cm]?[jt]sx?$/.test(file)
          )
            rmSync(join(directory, file))
        }
        const destination =
          member.path === 'packages/config'
            ? 'runner-probe.test.ts'
            : 'src/runner-probe.test.ts'
        writeFileSync(
          join(directory, destination),
          `import { expect, it } from 'vitest'\nit(${JSON.stringify(member.name)}, () => expect(1 + 1).toBe(2))\n`,
        )
      }
      for (const member of [
        'ui',
        'forms',
        'navigation',
        'query',
        'test-utils',
      ]) {
        writeFileSync(
          join(
            workspace.directory,
            'packages',
            member,
            'src/runner-probe.test.ts',
          ),
          `import { expect, it } from 'vitest'
import { createElement } from 'react'
import { render, screen } from '@testing-library/react'
it('@bcordes/${member}', () => {
  render(createElement('button', null, 'Runner fixture'))
  expect(screen.getByRole('button', { name: 'Runner fixture' })).toBeInTheDocument()
})
it('cleans the DOM between cases', () => expect(screen.queryByRole('button')).not.toBeInTheDocument())
`,
        )
      }
      const app = join(workspace.directory, 'apps/web/src')
      writeFileSync(
        join(app, 'shared/runner-probe.ts'),
        'export const label = "Runner fixture"\n',
      )
      writeFileSync(
        join(app, 'runner-probe.test.ts'),
        `import { expect, it } from 'vitest'
import { createElement } from 'react'
import { render, screen } from '@testing-library/react'
import { label } from '@/shared/runner-probe'
it('bcordes', () => {
  render(createElement('button', null, label))
  expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
})
it('cleans the DOM between cases', () => expect(screen.queryByRole('button')).not.toBeInTheDocument())
`,
      )
      const valid = runTool(workspace.directory, 'pnpm', [
        'exec',
        'vitest',
        'run',
        '--reporter=verbose',
      ])
      expect(valid.status, valid.stdout + valid.stderr).toBe(0)
      for (const member of workspace.packages)
        expect(valid.stdout + valid.stderr).toContain(member.name)
      writeFileSync(
        join(app, 'runner-probe.test.ts'),
        "import { expect, it } from 'vitest'\nit('reports a failing assertion', () => expect(true).toBe(false))\n",
      )
      const invalid = runTool(workspace.directory, 'pnpm', [
        'exec',
        'vitest',
        'run',
      ])
      expect(invalid.status).toBe(1)
      expect(invalid.stdout + invalid.stderr).toContain(
        'reports a failing assertion',
      )
    } finally {
      workspace.dispose()
    }
  },
)
