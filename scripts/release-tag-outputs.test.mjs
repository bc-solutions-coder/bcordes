import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const script = fileURLToPath(
  new URL('./release-tag-outputs.sh', import.meta.url),
)

for (const [tag, output] of [
  ['v0.1.7', 'version=0.1.7\nmajor=0\nminor=0.1\n'],
  ['v1.10.2', 'version=1.10.2\nmajor=1\nminor=1.10\n'],
]) {
  test(`writes version, major and minor outputs for ${tag}`, async (t) => {
    const directory = await mkdtemp(join(tmpdir(), 'bcordes-release-tag-'))
    t.after(() => rm(directory, { recursive: true, force: true }))
    const outputFile = join(directory, 'github-output')
    execFileSync('bash', [script, tag], {
      cwd: directory,
      env: { ...process.env, GITHUB_OUTPUT: outputFile },
      timeout: 5000,
    })
    assert.equal(await readFile(outputFile, 'utf8'), output)
  })
}
