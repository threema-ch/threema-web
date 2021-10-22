const dev = require('./webpack.dev.js');
const merge = require('webpack-merge').merge;

module.exports = merge(dev, {
  entry: {
    unittest: './tests/ts/bootstrap.ts',
    uitest: './tests/ui/bootstrap.ts',
    app_noinit: './tests/bootstrap.ts',
    unittest_karma: './tests/ts/main.ts',
  },
  devServer: {
    port: 7777,
  },
  output: {
    publicPath: '/dist/generated/',
  },
});
