import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { copyWorkspace, runTool } from './testing/workspace'

it(
  'accepts typed JSX and app aliases without emitting JavaScript and diagnoses invalid compiler inputs',
  { timeout: 30_000 },
  () => {
    const workspace = copyWorkspace()
    try {
      const directory = join(workspace.directory, 'apps/web/compiler-input')
      mkdirSync(directory)
      writeFileSync(
        join(directory, 'tsconfig.json'),
        JSON.stringify({
          extends: '../tsconfig.json',
          include: ['input.tsx'],
        }),
      )
      const input = join(directory, 'input.tsx')
      writeFileSync(
        join(workspace.directory, 'apps/web/src/shared/compiler-probe.ts'),
        'export const value: number = 42\n',
      )
      writeFileSync(
        input,
        "import { value } from '@/shared/compiler-probe'\nexport const element = <button>{value}</button>\n",
      )
      const valid = runTool(workspace.directory, 'pnpm', [
        'exec',
        'tsc',
        '-p',
        directory,
      ])
      expect(valid.status, valid.stdout + valid.stderr).toBe(0)
      expect(existsSync(join(directory, 'input.js'))).toBe(false)
      for (const [source, diagnostic] of [
        ['export const value: string = null', 'TS2322'],
        [
          'export function choose(value: number) { switch (value) { case 0: console.log(value); case 1: return 1 } }',
          'TS7029',
        ],
        ["import './missing-side-effect-module'", 'TS2882'],
        ['const unused = 42; export {}', 'TS6133'],
        ['export function identity(value) { return value }', 'TS7006'],
        ['export function constant(unused: string) { return 42 }', 'TS6133'],
      ]) {
        writeFileSync(input, source)
        const invalid = runTool(workspace.directory, 'pnpm', [
          'exec',
          'tsc',
          '-p',
          directory,
        ])
        expect(invalid.status).not.toBe(0)
        expect(invalid.stdout + invalid.stderr).toContain(diagnostic)
      }
    } finally {
      workspace.dispose()
    }
  },
)
