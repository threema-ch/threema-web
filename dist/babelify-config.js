const babelifyConfig = {
    presets: [
        ['@babel/preset-env', {
            useBuiltIns: 'entry',
            targets: {
                firefox: 60,
                chrome: 65,
                opera: 52,
                safari: 11,
            },
        }],
    ],
    extensions: '.ts',
}

module.exports = babelifyConfig;
