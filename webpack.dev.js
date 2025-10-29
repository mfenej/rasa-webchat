const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const { version } = require('./package.json');

module.exports = {
  entry: './umd.js',

  output: {
    path: path.resolve(__dirname, 'lib'),
    filename: 'index.js',
    library: {
      name: 'WebChat',
      type: 'umd',
    },
    clean: true, // replaces clean-webpack-plugin
  },

  mode: 'development',
  devtool: 'eval-source-map',

  // ✅ Webpack 5 no longer supports `contentBase` or `stats`
  devServer: {
    static: {
      directory: path.resolve(__dirname, 'lib'),
    },
    host: process.env.HOST || 'localhost',
    port: process.env.PORT || 8080,
    open: true,
    client: {
      overlay: true,
    },
    hot: true,
  },

  resolve: {
    extensions: ['.js', '.jsx'],
    // Add polyfills for Node built-ins (Webpack 5 removed them)
    fallback: {
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer'),
      path: require.resolve('path-browserify'),
      process: require.resolve('process/browser'),
    },
  },

  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'string-replace-loader',
            options: {
              search: 'PACKAGE_VERSION_TO_BE_REPLACED',
              replace: version,
            },
          },
          'babel-loader',
        ],
      },
      // 1. RULE FOR YOUR SASS (.scss) FILES
      {
        test: /\.scss$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              sourceMap: true,
            },
          },
          {
            loader: 'resolve-url-loader',
            options: {
              sourceMap: true,
            },
          },
          {
            loader: 'sass-loader',
            options: {
              implementation: require('sass'),
              sourceMap: true,
              additionalData: `
                @use "variables" as *;
                @use "animation" as *;
                @use "common" as *;
              `,   
              sassOptions: {
                loadPaths: [
                  path.resolve(__dirname, 'src/scss'),
                ],
              },
            },
          },
        ],
      },

      // 2. RULE FOR PLAIN .css FILES
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(jpg|png|gif|svg|woff|ttf|eot)$/,
        type: 'asset/resource', // replaces url-loader/file-loader
      },
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({
      title: 'Web Chat Widget Test',
      filename: 'index.html',
      inject: false,
      template: 'dev/src/index.html',
    }),

    // Provide Node globals for browser builds
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    }),

    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('development'),
      'process.env.PACKAGE_VERSION': JSON.stringify(version),
    }),
  ],
};
