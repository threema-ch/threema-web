const common = require('./webpack.common.js');
const merge = require('webpack-merge');
const path = require('path');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    contentBase: [
      path.join(__dirname),
      path.join(__dirname, 'public'),
      path.join(__dirname, 'src'),
    ],
    publicPath: '/dist/',
    compress: true,
    port: 9966,
  },
});
