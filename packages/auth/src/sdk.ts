import { createWallowSdk } from '@bc-solutions-coder/sdk'
import { getRequest, setResponseHeader } from '@tanstack/react-start/server'
import { getBff } from './bff'
import { getSession } from './session'

/** Each server request gets its own SDK client and cookie context. */
export async function createRequestSdk() {
  const incoming = getRequest()
  const bff = getBff()
  const session = await getSession()
  return createWallowSdk({
    baseUrl: new URL('/api', bff.config.redirectUri).href,
    cookieHeader: incoming.headers.get('cookie') ?? '',
    fetch: async (input, init) => {
      const request =
        input instanceof Request ? input : new Request(input, init)
      if (session?.csrfToken)
        request.headers.set('x-csrf-token', session.csrfToken)
      for (const name of ['x-forwarded-for', 'x-forwarded-proto']) {
        const value = incoming.headers.get(name)
        if (value) request.headers.set(name, value)
      }
      const peer =
        'ip' in incoming && typeof incoming.ip === 'string'
          ? incoming.ip
          : undefined
      const response = await bff.handleApi(Object.assign(request, { ip: peer }))
      const cookies = response.headers.getSetCookie()
      if (cookies.length) setResponseHeader('Set-Cookie', cookies)
      return response
    },
  })
}
