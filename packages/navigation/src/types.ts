export interface NavItem {
  readonly label: string
  /** Router destination path. */
  readonly to: string
  /** Require an exact path match for active-link styling. */
  readonly exact?: boolean
}
