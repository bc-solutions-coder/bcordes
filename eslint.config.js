//  @ts-check

// The whole flat config — the TanStack base, the ignores, and the module
// boundary rules — lives in @bcordes/config so every workspace package is
// linted by the same rules. Change it there, not here.
import { config } from '@bcordes/config/eslint'

export default config
