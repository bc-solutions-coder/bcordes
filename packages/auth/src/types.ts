/** API profile matched to the session subject, with session organization fields. */
export interface User {
  /** API profile ID, verified against the session subject. */
  id: string
  /** Profile name, falling back to session name, email, then "User". */
  name: string
  email: string
  roles: Array<string>
  /** Permissions expanded from roles by Wallow */
  permissions: Array<string>
  /** Session organization ID, or an empty string. */
  tenantId: string
  /** Session organization name, or an empty string. */
  tenantName: string
}

export type { BffSession as SessionData } from '@bc-solutions-coder/sdk/server'
