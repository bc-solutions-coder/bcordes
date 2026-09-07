import { createServiceClient } from '@bc-solutions-coder/sdk/server/service'
import { getSdkRedis } from '@bcordes/valkey/sdk'

let instance: ReturnType<typeof createServiceClient> | undefined

export function getInquiryService() {
  instance ??= createServiceClient({
    store: getSdkRedis(),
  })
  return instance
}
