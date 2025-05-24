module.exports = {
    extends: ['eslint-config-willo-base'],
    rules: {
        'no-trailing-spaces': 'off',
        'comma-dangle': ['error', 'only-multiline'],
        'max-len': ['error', { code: 120 }],
        'padding-line-between-statements': 'off',
    },
};

