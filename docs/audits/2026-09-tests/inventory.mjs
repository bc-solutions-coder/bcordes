import ts from 'typescript'
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const output = dirname(fileURLToPath(import.meta.url))
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean)
const files = tracked.filter((file) =>
  /\.(test|spec)\.[cm]?[jt]sx?$/.test(file),
)
const declarations = []
const assertions = []
const inventory = []
const compact = (text) => text.replace(/\s+/g, ' ').trim()
function chain(node, source) {
  if (ts.isIdentifier(node)) return node.text
  if (ts.isPropertyAccessExpression(node))
    return `${chain(node.expression, source)}.${node.name.text}`
  if (ts.isCallExpression(node) || ts.isTaggedTemplateExpression(node))
    return chain(node.expression ?? node.tag, source)
  return node.getText(source)
}
for (const file of files) {
  const text = readFileSync(file, 'utf8')
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
  const runner = file.includes('/e2e/') ? 'playwright' : 'vitest'
  const signals = [
    /readFile|readFileSync|\?raw|existsSync|readdir|node:fs/.test(text)
      ? 'filesystem-or-raw'
      : '',
    /migration|migrat|legacy|no longer|removed|old imports/i.test(text)
      ? 'migration-language'
      : '',
  ]
    .filter(Boolean)
    .join(',')
  let count = 0
  function walk(node, suites = [], test = '') {
    if (ts.isCallExpression(node)) {
      const callee = chain(node.expression, source)
      const first = node.arguments[0]
      const callback = node.arguments.find(
        (arg) => ts.isArrowFunction(arg) || ts.isFunctionExpression(arg),
      )
      const literal =
        first &&
        (ts.isStringLiteralLike(first) || ts.isTemplateExpression(first))
      if (
        /^(describe|it|test)(\.|$)/.test(callee) &&
        literal &&
        (callback || /\.(todo|skip|fixme)$/.test(callee))
      ) {
        const suite = /^(describe|test\.describe)(\.|$)/.test(callee)
        const title = ts.isStringLiteralLike(first)
          ? first.text
          : first.getText(source)
        const fullTitle = [...suites, title].join(' > ')
        const line =
          source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1
        declarations.push({
          file,
          line,
          runner,
          kind: suite ? 'suite' : 'test',
          declaration: callee,
          title,
          fullTitle,
          signals,
          review: 'pending',
        })
        if (!suite) count++
        if (callback)
          ts.forEachChild(callback, (child) =>
            walk(
              child,
              suite ? [...suites, title] : suites,
              suite ? test : fullTitle,
            ),
          )
        return
      }
      if (
        /^(expect|assert)(\.|$)/.test(callee) &&
        ts.isPropertyAccessExpression(node.expression)
      ) {
        assertions.push({
          file,
          line:
            source.getLineAndCharacterOfPosition(node.getStart(source)).line +
            1,
          test: test || '(suite/helper)',
          assertion: compact(node.getText(source)),
        })
        // The outer matcher captures chained expect calls once.
        for (const arg of node.arguments) walk(arg, suites, test)
        return
      }
    }
    ts.forEachChild(node, (child) => walk(child, suites, test))
  }
  walk(source)
  inventory.push({
    file,
    runner,
    declarations: count,
    signals,
    review: 'pending',
  })
}
function tsv(name, rows, fields) {
  writeFileSync(
    join(output, name),
    [
      fields.join('\t'),
      ...rows.map((row) =>
        fields.map((field) => compact(String(row[field] ?? ''))).join('\t'),
      ),
    ].join('\n') + '\n',
  )
}
tsv('files.tsv', inventory, [
  'file',
  'runner',
  'declarations',
  'signals',
  'review',
])
tsv('titles.tsv', declarations, [
  'file',
  'line',
  'runner',
  'kind',
  'declaration',
  'title',
  'fullTitle',
  'signals',
  'review',
])
tsv('assertions.tsv', assertions, ['file', 'line', 'test', 'assertion'])
console.log(
  JSON.stringify(
    {
      files: files.length,
      tests: inventory.reduce((sum, row) => sum + row.declarations, 0),
      titles: declarations.length,
      assertions: assertions.length,
      emptyFiles: inventory.filter((row) => !row.declarations),
      candidates: inventory.filter((row) => row.signals).length,
    },
    null,
    2,
  ),
)

// Optional runner reports preserve expanded titles alongside static declarations.
const [vitestReport, browserReport] = process.argv.slice(2)
if (vitestReport && browserReport) {
  const root = process.cwd() + '/'
  const results = JSON.parse(readFileSync(vitestReport, 'utf8'))
  const runtime = results.testResults.flatMap((file) =>
    file.assertionResults.map((test) => ({
      file: file.name.replace(root, ''),
      runner: 'vitest',
      title: test.fullName,
      status: test.status,
    })),
  )
  const browser = JSON.parse(readFileSync(browserReport, 'utf8'))
  function visitSuite(suite, parents = []) {
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests) {
        runtime.push({
          file: `apps/web/e2e/${spec.file}`,
          runner: 'playwright',
          title: [...parents, spec.title].join(' > '),
          status: test.status ?? 'discovered',
        })
      }
    }
    for (const child of suite.suites ?? [])
      visitSuite(child, [...parents, child.title])
  }
  for (const suite of browser.suites) visitSuite(suite)
  tsv('runtime-titles.tsv', runtime, ['file', 'runner', 'title', 'status'])
  const observed = new Set(runtime.map((test) => test.file))
  const missing = files.filter((file) => !observed.has(file))
  const extra = [...observed].filter((file) => !files.includes(file))
  if (missing.length || extra.length)
    throw new Error(JSON.stringify({ missing, extra }))
  console.log(
    `Reconciled ${runtime.length} runtime cases across all ${files.length} tracked test files.`,
  )
}
