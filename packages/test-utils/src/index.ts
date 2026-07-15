// The canonical public entry for @bcordes/test-utils.
//
// It re-exports the framework-generic render helper plus the whole
// @testing-library/react surface, so a consumer imports renderWithProviders
// and the query/act helpers from this single package instead of the old
// app-local render helper module.
//
// Deliberately does NOT re-export any app-specific fixtures. The auth and
// wallow mock factories live behind their own packages' testing subpaths;
// pulling them in here would invert the dependency graph (test-utils would
// depend on the packages that depend on it).
export { renderWithProviders } from './render'
export * from '@testing-library/react'
