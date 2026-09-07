export default {
  meta: { name: 'bcordes' },
  rules: {
    'type-parameter-name': {
      meta: {
        type: 'suggestion',
        schema: [],
        messages: {
          invalid:
            'Type parameter {{name}} must be T or T followed by an uppercase letter and at least one more ASCII letter (for example, TValue).',
        },
      },
      create(context) {
        return {
          'TSTypeParameterDeclaration > TSTypeParameter'(node) {
            const name = node.name.name
            if (!/^(T|T[A-Z][A-Za-z]+)$/.test(name)) {
              context.report({
                node: node.name,
                messageId: 'invalid',
                data: { name },
              })
            }
          },
        }
      },
    },
  },
}
