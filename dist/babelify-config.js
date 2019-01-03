const babelifyConfig = {
    presets: [
        ['@babel/preset-env', {
            'useBuiltIns': 'entry',
        }],
    ],
    extensions: '.ts',
}

module.exports = babelifyConfig;
