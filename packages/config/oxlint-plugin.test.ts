import { spawnSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'

const packageDir = dirname(fileURLToPath(import.meta.url))
const root = resolve(packageDir, '../..')

it('reports invalid type parameter names and accepts supported names and suppression', () => {
  const directory = mkdtempSync(join(tmpdir(), 'bcordes-naming-'))
  try {
    writeFileSync(
      join(directory, '.oxlintrc.json'),
      JSON.stringify({
        plugins: [],
        categories: { correctness: 'off' },
        jsPlugins: [
          { name: 'bcordes', specifier: join(packageDir, 'oxlint-plugin.js') },
        ],
        rules: { 'bcordes/type-parameter-name': 'error' },
      }),
    )
    const valid = ['T', 'TValue', 'TURL', 'TAb', 'TLowercase']
    const invalid = [
      'Bad',
      'TA',
      'tValue',
      '_TValue',
      'TValue_',
      'TValue2',
      'T_Value',
      'TÉclair',
      'Tlowercase',
    ]
    for (const [index, name] of [...valid, ...invalid].entries()) {
      writeFileSync(
        join(directory, `${index}.ts`),
        `export type Box<${name}> = { value: ${name} }`,
      )
    }
    const declarations = {
      'function.ts':
        'export function identity<Bad>(value: Bad): Bad { return value }',
      'class.ts': 'export class Box<Bad> {}',
      'interface.ts': 'export interface Container<Bad> {}',
      'arrow.tsx': 'export const arrow = <Bad,>(value: Bad) => value',
      'method.ts': 'export type Method = { read<Bad>(): Bad }',
    }
    for (const [file, source] of Object.entries(declarations))
      writeFileSync(join(directory, file), source)
    writeFileSync(
      join(directory, 'infer.ts'),
      'export type Conditional<T> = T extends Array<infer Bad> ? Bad : never',
    )
    writeFileSync(
      join(directory, 'mapped.ts'),
      'export type Mapped<T> = { [Key in keyof T]: T[Key] }',
    )
    writeFileSync(
      join(directory, 'suppressed.ts'),
      `
      // oxlint-disable-next-line bcordes/type-parameter-name
      export type Box<Bad> = { value: Bad }
    `,
    )
    const result = spawnSync(
      join(root, 'node_modules/.bin/oxlint'),
      ['--format', 'json', '.'],
      {
        cwd: directory,
        encoding: 'utf8',
      },
    )
    expect(result.status).toBe(1)
    const output = JSON.parse(result.stdout)
    expect(output.diagnostics).toHaveLength(invalid.length + 5)
    for (const [index] of invalid.entries()) {
      expect(output.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            filename: `${valid.length + index}.ts`,
            code: 'bcordes(type-parameter-name)',
          }),
        ]),
      )
    }
    for (const filename of Object.keys(declarations)) {
      expect(output.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            filename,
            code: 'bcordes(type-parameter-name)',
          }),
        ]),
      )
    }
    for (const name of [
      ...valid.map((_, index) => String(index)),
      'suppressed',
      'infer',
      'mapped',
    ]) {
      expect(output.diagnostics).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ filename: `${name}.ts` }),
        ]),
      )
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

it('rejects forbidden imports and style violations, permits exceptions, and fixes supported style errors', () => {
  const directory = mkdtempSync(join(tmpdir(), 'bcordes-lint-'))
  try {
    const config = JSON.parse(
      readFileSync(join(root, '.oxlintrc.json'), 'utf8'),
    )
    config.jsPlugins = [
      { name: 'bcordes', specifier: join(packageDir, 'oxlint-plugin.js') },
      {
        name: 'style-js',
        specifier: fileURLToPath(
          import.meta.resolve('@stylistic/eslint-plugin'),
        ),
      },
      {
        name: 'import-js',
        specifier: fileURLToPath(import.meta.resolve('eslint-plugin-import-x')),
      },
    ]
    writeFileSync(join(directory, '.oxlintrc.json'), JSON.stringify(config))
    writeFileSync(
      join(directory, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          strict: true,
          target: 'ES2022',
          module: 'ESNext',
          moduleResolution: 'bundler',
          noEmit: true,
        },
        include: ['apps/**/*.ts', 'packages/**/*.ts'],
      }),
    )
    const cases = [
      {
        path: 'apps/web/src/routes/shared-deep.ts',
        source: "import '@/shared/auth/hooks/useUser'",
        rule: 'eslint(no-restricted-imports)',
      },
      {
        path: 'apps/web/src/routes/app-deep.ts',
        source: "import '@/app/components/layout/Header'",
        rule: 'eslint(no-restricted-imports)',
      },
      {
        path: 'apps/web/src/routes/package-deep.ts',
        source: "import '@bcordes/auth/src/session'",
        rule: 'eslint(no-restricted-imports)',
      },
      {
        path: 'apps/web/src/features/example/routes.ts',
        source: "import '@/routes/index'",
        rule: 'eslint(no-restricted-imports)',
      },
      {
        path: 'apps/web/src/shared/example/routes.ts',
        source: "import '@/routes/index'",
        rule: 'eslint(no-restricted-imports)',
      },
      {
        path: 'apps/web/src/app/example/routes.ts',
        source: "import '@/routes/index'",
        rule: 'eslint(no-restricted-imports)',
      },
      {
        path: 'apps/web/src/routes/deep.ts',
        source: `import '${['@/features/home', 'components/Hero'].join('/')}'`,
        rule: 'eslint(no-restricted-imports)',
      },
      {
        path: 'apps/web/src/routes/tilde.ts',
        source: "import '~/features/home'",
        rule: 'eslint(no-restricted-imports)',
      },
      {
        path: 'packages/auth/src/ui.ts',
        source: "import '@bcordes/ui/components/button'",
        rule: 'eslint(no-restricted-imports)',
      },
      {
        path: 'packages/query/src/deep.ts',
        source: "import '@bcordes/auth/src/internal'",
        rule: 'eslint(no-restricted-imports)',
      },
      {
        path: 'apps/web/src/routes/condition.ts',
        source:
          'export function read(value: { key: string }) { if (value) return value.key; return "" }',
        rule: 'typescript(no-unnecessary-condition)',
      },
      {
        path: 'apps/web/src/routes/comment.ts',
        source: '//bad\nexport const value = 1',
        rule: 'style-js(spaced-comment)',
      },
      {
        path: 'apps/web/src/routes/order.ts',
        source: "import x from './local'\nimport fs from 'node:fs'",
        rule: 'import-js(order)',
      },
      {
        path: 'apps/web/src/routes/members.ts',
        source: "import { z, a } from 'example-lib'",
        rule: 'eslint(sort-imports)',
      },
      {
        path: 'apps/web/src/routes/node.ts',
        source: "import 'fs'",
        rule: 'unicorn(prefer-node-protocol)',
      },
    ]
    const clean = [
      {
        path: 'apps/web/src/app/example/public.ts',
        source: "import '@/features/home'",
      },
      {
        path: 'apps/web/src/features/example/public.ts',
        source: "import '@/shared/auth'",
      },
      {
        path: 'apps/web/src/shared/example/public.ts',
        source: "import '@bcordes/utils'",
      },
      {
        path: 'apps/web/src/routes/public.ts',
        source: "import '@/features/home'",
      },
      {
        path: 'packages/query/src/public.ts',
        source: "import '@bcordes/ui/components/button'",
      },
      {
        path: 'packages/auth/src/public.ts',
        source: "import '@bcordes/valkey'",
      },
      {
        path: 'packages/ui/src/components/condition.ts',
        source:
          'export function read(value: { key: string }) { if (value) return value.key; return "" }',
      },
      {
        path: 'packages/forms/src/condition.ts',
        source:
          'export function read(value: { key: string }) { if (value) return value.key; return "" }',
      },
      {
        path: 'apps/web/src/routes/suppressed.ts',
        source:
          'export function read(value: { key: string }) {\n// oxlint-disable-next-line typescript/no-unnecessary-condition\nif (value) return value.key; return "" }',
      },
    ]
    for (const fixture of [...cases, ...clean]) {
      const file = join(directory, fixture.path)
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, fixture.source)
    }
    const result = spawnSync(
      join(root, 'node_modules/.bin/oxlint'),
      ['--type-aware', '--format', 'json', 'apps', 'packages'],
      { cwd: directory, encoding: 'utf8' },
    )
    expect(result.status).toBe(1)
    const output = JSON.parse(result.stdout)
    expect(output.diagnostics).toHaveLength(cases.length)
    for (const fixture of cases) {
      expect(output.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            filename: fixture.path,
            code: fixture.rule,
          }),
        ]),
      )
    }
    const fixPaths = [
      'apps/web/src/routes/comment.ts',
      'apps/web/src/routes/order.ts',
    ]
    for (const flags of [['--fix'], []]) {
      const fixed = spawnSync(
        join(root, 'node_modules/.bin/oxlint'),
        [...flags, ...fixPaths],
        {
          cwd: directory,
          encoding: 'utf8',
        },
      )
      expect(fixed.status, fixed.stdout + fixed.stderr).toBe(0)
    }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
