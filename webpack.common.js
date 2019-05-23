const path = require('path');
const webpack = require('webpack');

// Target a version without class support due to this issue:
// https://stackoverflow.com/q/43307607
// This does not mean that we support Firefox <60ESR!
// We will increase the target again once FF52 has died out.
const minFirefoxTarget = 44;
const babelOptions = {
  presets: [
    ['@babel/preset-env', {
      corejs: 3,
      useBuiltIns: 'entry',
      targets: {
        firefox: minFirefoxTarget,
        chrome: 65,
        opera: 52,
        safari: 11,
      },
    }],
  ],
  plugins: [
    ['@babel/plugin-transform-runtime', {
      regenerator: true,
    }],
    ['@babel/plugin-syntax-dynamic-import'],
  ],
};

module.exports = {
  entry: {
    app: './src/bootstrap.ts',
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {loader: 'babel-loader', options: babelOptions},
          {loader: 'ts-loader'},
        ],
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [
          {loader: 'babel-loader', options: babelOptions},
        ],
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.ts', '.wasm'],
  },
  output: {
    path: path.resolve(__dirname, 'dist', 'generated'),
    filename: '[name].bundle.js',
    chunkFilename: '[name].[chunkhash].bundle.js',
  },
};
