/** Authenticated user identity resolved from an OIDC JWT */
export interface User {
  /** OIDC JWT sub claim */
  id: string
  /** Profile display name claim */
  name: string
  /** Email claim */
  email: string
  /** Roles assigned to the user (e.g. admin, manager, user) */
  roles: Array<string>
  /** Permissions expanded from roles by Wallow */
  permissions: Array<string>
  /** Tenant identifier from the organization claim */
  tenantId: string
  /** Tenant display name from the organization claim */
  tenantName: string
}

export type { BffSession as SessionData } from '@bc-solutions-coder/sdk/server'
