import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { expect, it } from 'vitest'
import { copyWorkspace, runTool } from './testing/workspace'

it(
  'reports a type error in every workspace member through the root typecheck command',
  { timeout: 240_000 },
  () => {
    const workspace = copyWorkspace()
    try {
      const valid = runTool(workspace.directory, 'pnpm', ['typecheck'])
      expect(valid.status, valid.stdout + valid.stderr).toBe(0)
      for (const member of workspace.packages) {
        const probe = join(
          workspace.directory,
          member.path,
          'src',
          '__typecheck_probe__.ts',
        )
        mkdirSync(dirname(probe), { recursive: true })
        writeFileSync(
          probe,
          "export const invalidTypecheckProbe: number = 'not a number'\n",
        )
        try {
          const invalid = runTool(workspace.directory, 'pnpm', ['typecheck'])
          expect(
            invalid.status,
            member.name + invalid.stdout + invalid.stderr,
          ).not.toBe(0)
          expect(invalid.stdout + invalid.stderr).toContain(
            '__typecheck_probe__.ts',
          )
          expect(invalid.stdout + invalid.stderr).toContain('TS2322')
          expect(existsSync(probe.replace(/\.ts$/, '.js'))).toBe(false)
        } finally {
          rmSync(probe, { force: true })
        }
      }
      const restored = runTool(workspace.directory, 'pnpm', ['typecheck'])
      expect(restored.status, restored.stdout + restored.stderr).toBe(0)
    } finally {
      workspace.dispose()
    }
  },
)
