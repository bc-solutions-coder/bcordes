import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const root = fileURLToPath(new URL('../', import.meta.url))
const baseline = process.argv[2]
const scope = process.argv[3] ?? 'apps/'
if (!baseline) {
  throw new Error(
    'Usage: node scripts/check-comment-edits.mjs <git-ref> [scope]',
  )
}

function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' })
}

const revision = git('rev-parse', '--verify', `${baseline}^{commit}`).trim()
const changes = git(
  'diff',
  '--name-status',
  '--no-renames',
  '-z',
  revision,
  '--',
  scope,
)
  .split('\0')
  .filter(Boolean)

function emittedSyntax(source, path) {
  const result = ts.transpileModule(source, {
    fileName: path,
    reportDiagnostics: true,
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      removeComments: true,
      newLine: ts.NewLineKind.LineFeed,
    },
  })
  const errors = result.diagnostics?.filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  )
  assert.equal(errors?.length ?? 0, 0, `${path}: transpilation failed`)
  const file = ts.createSourceFile(
    `${path}.js`,
    result.outputText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  )
  function visit(node) {
    const children = node.getChildren(file)
    return children.length
      ? [node.kind, children.map(visit)]
      : [node.kind, node.getText(file)]
  }
  return visit(file)
}

let checked = 0
const otherFiles = []
for (let index = 0; index < changes.length; index += 2) {
  const [status, path] = changes.slice(index, index + 2)
  if (!/\.[cm]?[jt]sx?$/.test(path)) {
    otherFiles.push(path)
    continue
  }
  assert.equal(
    status,
    'M',
    `${path}: added or deleted source needs separate review`,
  )
  const before = git('show', `${revision}:${path}`)
  const after = readFileSync(
    new URL(path, new URL('../', import.meta.url)),
    'utf8',
  )
  assert.deepEqual(
    emittedSyntax(after, path),
    emittedSyntax(before, path),
    `${path}: emitted JavaScript changed`,
  )
  checked++
}

assert.ok(
  checked > 0,
  'No changed JavaScript or TypeScript files in this scope',
)
console.log(
  `Unchanged emitted JavaScript in ${checked} files since ${revision}.`,
)
if (otherFiles.length)
  console.log(`Separate review required: ${otherFiles.join(', ')}`)
console.log(
  'Also verify types, tool directives, source scans, CSS and build behavior.',
)
