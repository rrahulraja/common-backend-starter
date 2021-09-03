module.exports = {
  extends: ['airbnb-typescript/base', 'plugin:prettier/recommended', 'prettier/@typescript-eslint'],
  plugins: ['prettier'],
  rules: {
    'import/prefer-default-export': 0,
    'import/named': 0,
    'class-methods-use-this': 0,
    'no-void': ['error', { allowAsStatement: true }],

    '@typescript-eslint/prefer-readonly': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/no-non-null-asserted-optional-chain': 'error',
    '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],

    'prettier/prettier': 'error',
  },
}
