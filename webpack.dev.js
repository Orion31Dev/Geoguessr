const { merge } = require('webpack-merge');
const webpack = require('webpack');
const commonConfig = require('./webpack.common');

const dotenv = require('dotenv').config();

module.exports = merge(commonConfig, {
  mode: 'development',
  entry: [
    'babel-polyfill',
    'react-hot-loader/patch', // activate HMR for React
    'webpack/hot/only-dev-server', // bundle the client for hot reloading, only- means to only hot reload for successful updates
    './src/index.tsx', // the entry point of our app
  ],
  devServer: {
    hot: true, // enable HMR on the server
  },
  devtool: 'cheap-module-source-map',
  plugins: [
    new webpack.HotModuleReplacementPlugin(), // enable HMR globally,
    new webpack.DefinePlugin({
      'process.env': JSON.stringify(dotenv.parsed),
    }),
  ],
});
