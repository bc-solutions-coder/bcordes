/**
 * A single navigation entry. Product-agnostic: it carries no branding, no auth
 * state, and no Wallow coupling — the consuming app supplies the concrete
 * routes. `to` is a router path; `exact` narrows active-link matching to an
 * exact path match (maps to TanStack Router's `activeOptions={{ exact }}`).
 */
export interface NavItem {
  readonly label: string
  readonly to: string
  readonly exact?: boolean
}
