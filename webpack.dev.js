const common = require('./webpack.common.js');
const merge = require('webpack-merge');
const path = require('path');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'inline-source-map',
  devServer: {
    static: [
      {directory: path.join(__dirname)},
      {directory: path.join(__dirname, 'public')},
      {directory: path.join(__dirname, 'src')},
    ],
    host: '127.0.0.1',
    port: 9966,
  },
});
