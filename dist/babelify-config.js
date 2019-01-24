// Target a version without class support due to this issue:
// https://stackoverflow.com/q/43307607
// This does not mean that we support Firefox <60ESR!
// We will increase the target again once FF52 has died out.
const minFirefoxTarget = 44;

const babelifyConfig = {
    presets: [
        ['@babel/preset-env', {
            useBuiltIns: 'entry',
            targets: {
                firefox: minFirefoxTarget,
                chrome: 65,
                opera: 52,
                safari: 11,
            },
        }],
    ],
    extensions: '.ts',
}

module.exports = babelifyConfig;
