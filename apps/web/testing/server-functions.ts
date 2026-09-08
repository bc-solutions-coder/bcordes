export function createServerFn() {
  let validate = (input: unknown) => input
  const chain = {
    inputValidator: (validator: { parse: (input: unknown) => unknown }) => {
      validate = (input) => validator.parse(input)
      return chain
    },
    handler:
      (handler: (context: { data: unknown }) => Promise<unknown>) =>
      async (options?: { data?: unknown }) =>
        handler({ data: validate(options?.data) }),
  }
  return chain
}
