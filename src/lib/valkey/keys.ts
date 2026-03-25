export const keys = {
  session(id: string): string {
    return `bcordes:session:${id}`
  },
  sessionLock(id: string): string {
    return `bcordes:lock:session:${id}`
  },
  serviceToken(): string {
    return 'bcordes:service-token'
  },
  serviceTokenLock(): string {
    return 'bcordes:lock:service-token'
  },
  oidcConfig(): string {
    return 'bcordes:oidc-config'
  },
}
