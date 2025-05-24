module.exports = {
    extends: ['eslint-config-willo-base'],
    rules: {
        'no-trailing-spaces': 'off',
        'comma-dangle': ['error', 'only-multiline'],
        'max-len': ['error', { code: 120 }],
        'padding-line-between-statements': 'off',
        'arrow-parens': 'off',
        'no-restricted-properties': 'off',
        'arrow-body-style': 'off',
        'no-loop-func': 'off',
    },
};
