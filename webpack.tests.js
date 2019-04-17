const dev = require('./webpack.dev.js');
const merge = require('webpack-merge');

module.exports = merge(dev, {
    entry: {
        unittest: './tests/ts/main.ts',
        uitest: './tests/ui/main.ts',
    },
    devServer: {
        port: 7777,
    },
});
