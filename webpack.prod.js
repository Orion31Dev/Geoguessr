const { merge } = require('webpack-merge');
const { resolve } = require('path');

const webpack = require('webpack');

const commonConfig = require('./webpack.common');

module.exports = merge(commonConfig, {
  mode: 'production',
  entry: ['babel-polyfill', './src/index.tsx'],
  output: {
    filename: 'js/bundle.[contenthash].min.js',
    path: resolve(__dirname, './dist'),
  },
  plugins: [new webpack.EnvironmentPlugin({ REACT_APP_API_KEY: '', REACT_APP_VERSION: 'UNK', REACT_APP_BUILD_NUM: '???' })],
});
