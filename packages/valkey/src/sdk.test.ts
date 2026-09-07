import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { startTestValkey } from '../../../scripts/test-fixtures/valkey'
import { getValkey } from './client'
import { getSdkRedis } from './sdk'

let server: ReturnType<typeof startTestValkey> | undefined

beforeAll(async () => {
  server = startTestValkey()
  vi.stubEnv('REDIS_URL', server.url)
  await getValkey().ping()
}, 30_000)

afterAll(() => {
  if (server) {
    try {
      getValkey().disconnect()
    } finally {
      server.stop()
    }
  }
  vi.unstubAllEnvs()
})

it('stores, replaces and deletes values through the SDK storage interface', async () => {
  const store = getSdkRedis()
  expect(await store.get('value')).toBeNull()
  await store.set('value', 'first')
  expect(await store.get('value')).toBe('first')
  await store.set('value', 'replacement')
  expect(await store.get('value')).toBe('replacement')
  await store.del('value')
  expect(await store.get('value')).toBeNull()
})

it('conditionally creates values without overwriting an existing value', async () => {
  const store = getSdkRedis()
  expect(await store.set('conditional', 'first', { nx: true })).toBe('OK')
  expect(await store.set('conditional', 'second', { nx: true })).toBeNull()
  expect(await store.get('conditional')).toBe('first')
})

it('expires values created with and without conditional creation', async () => {
  const store = getSdkRedis()
  await store.set('expires', 'ordinary', { ex: 1 })
  await store.set('conditional-expiry', 'first', { ex: 1, nx: true })
  expect(
    await store.set('conditional-expiry', 'second', { ex: 1, nx: true }),
  ).toBeNull()
  expect(await store.get('expires')).toBe('ordinary')
  expect(await store.get('conditional-expiry')).toBe('first')
  await expect.poll(() => store.get('expires'), { timeout: 3000 }).toBeNull()
  await expect
    .poll(() => store.get('conditional-expiry'), { timeout: 3000 })
    .toBeNull()
})

it('adds unique set members, removes members and expires the set', async () => {
  const store = getSdkRedis()
  await store.sadd('members', 'alice')
  await store.sadd('members', 'alice')
  await store.sadd('members', 'bob')
  expect((await store.smembers('members')).sort()).toEqual(['alice', 'bob'])
  await store.srem('members', 'alice')
  expect(await store.smembers('members')).toEqual(['bob'])
  await store.expire('members', 1)
  await expect
    .poll(() => store.smembers('members'), { timeout: 3000 })
    .toEqual([])
})
