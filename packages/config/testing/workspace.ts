import { execFileSync, spawnSync } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  symlinkSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const repository = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../..',
)

export function workspacePackages() {
  const output: unknown = JSON.parse(
    execFileSync('pnpm', ['-r', 'list', '--depth', '-1', '--json'], {
      cwd: repository,
      encoding: 'utf8',
    }),
  )
  if (!Array.isArray(output))
    throw new Error('Workspace listing must be an array')
  return output
    .map((entry: unknown) => {
      if (
        typeof entry !== 'object' ||
        entry === null ||
        !('path' in entry) ||
        typeof entry.path !== 'string' ||
        !('name' in entry) ||
        typeof entry.name !== 'string'
      )
        throw new Error('Workspace member is missing its name or path')
      return { path: relative(repository, entry.path), name: entry.name }
    })
    .filter((member) => member.path !== '')
}

export function copyWorkspace() {
  const directory = mkdtempSync(join(tmpdir(), 'bcordes-tool-input-'))
  const packages = workspacePackages()
  try {
    const files = execFileSync(
      'git',
      [
        'ls-files',
        '-z',
        '--cached',
        '--others',
        '--exclude-standard',
        'apps',
        'packages',
        'scripts',
        'package.json',
        'pnpm-workspace.yaml',
        'pnpm-lock.yaml',
        'vitest.config.ts',
      ],
      { cwd: repository, encoding: 'utf8' },
    )
      .split('\0')
      .filter(Boolean)
    for (const file of files) {
      const source = join(repository, file)
      if (!existsSync(source)) continue
      const target = join(directory, file)
      mkdirSync(dirname(target), { recursive: true })
      cpSync(source, target)
    }
    for (const member of ['', ...packages.map((item) => item.path)]) {
      const modules = join(repository, member, 'node_modules')
      if (!existsSync(modules)) continue
      const target = join(directory, member, 'node_modules')
      mkdirSync(target, { recursive: true })
      for (const entry of readdirSync(modules, { withFileTypes: true })) {
        if (
          entry.name === '.cache' ||
          entry.name === '.vite' ||
          entry.name.startsWith('.pnpm-task-run-state')
        )
          continue
        const source = join(modules, entry.name)
        const destination = join(target, entry.name)
        if (entry.name === '@bcordes') {
          mkdirSync(destination)
          for (const dependency of readdirSync(source)) {
            const local = packages.find(
              (item) => item.name === `@bcordes/${dependency}`,
            )
            symlinkSync(
              local ? join(directory, local.path) : join(source, dependency),
              join(destination, dependency),
              'dir',
            )
          }
        } else if (entry.isFile()) cpSync(source, destination)
        else symlinkSync(source, destination, 'dir')
      }
    }
    return {
      directory,
      packages,
      dispose: () => rmSync(directory, { recursive: true, force: true }),
    }
  } catch (error) {
    rmSync(directory, { recursive: true, force: true })
    throw error
  }
}

export function runTool(
  directory: string,
  command: string,
  args: Array<string>,
) {
  return spawnSync(command, args, {
    cwd: directory,
    encoding: 'utf8',
    timeout: 120_000,
    maxBuffer: 16 * 1024 * 1024,
  })
}
