// The devtools panel is deliberately NOT re-exported here. __root.tsx pulls it
// in through a dynamic import of the '@bcordes/query/devtools' subpath so that
// @tanstack/react-query-devtools stays out of the production bundle.
export { Provider, getContext } from './root-provider'
