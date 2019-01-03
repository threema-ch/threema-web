const babelifyConfig = {
    presets: [
        ['@babel/preset-env', {
            'useBuiltIns': 'entry',
            'targets': {
                'firefox': 50,
                'chrome': 45,
                'opera': 32,
                'safari': 11,
            },
        }],
    ],
    extensions: '.ts',
}

module.exports = babelifyConfig;
