const path = require('path');
const webpack = require('webpack');
const { version } = require('./package.json');

// --- Common Configuration ---
// All rules and settings shared by both builds
const commonConfig = {
  mode: 'production',
  resolve: {
    extensions: ['.js', '.jsx'],
    fallback: {
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer'),
      path: require.resolve('path-browserify'),
      process: require.resolve('process/browser'),
    },
    // ⛔️ We DO NOT include 'fallback' or 'ProvidePlugin' here.
    // Those are for the demo app, not the library build.
    // The consumer of your library must provide their own polyfills.
  },
  module: {
    // All the rules from your webpack.dev.js
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
      {
        test: /\.scss$/,
        use: [
          'style-loader',
          'css-loader',
          'resolve-url-loader',
          {
            loader: 'sass-loader',
            options: {
              implementation: require('sass'),
              // We remove sourceMaps for production
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
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(jpg|png|gif|svg|woff|ttf|eot)$/,
        type: 'asset/resource', // Use asset/resource for prod
      },
    ],
  },
  plugins: [
    // ⛔️ We DO NOT include HtmlWebpackPlugin.
    new webpack.DefinePlugin({
      // Webpack sets NODE_ENV automatically in 'production' mode
      'process.env.PACKAGE_VERSION': JSON.stringify(version),
    }),
  ],
};

// --- Build 1: CommonJS (CJS) for "main" field ---
const cjsConfig = {
  ...commonConfig,
  entry: './index.js', // Your library's main entry
  output: {
    path: path.join(__dirname, 'lib'),
    filename: 'index.js',
    library: {
      type: 'commonjs2',
    },
    clean: true,
  },
  // ✅ This is CRITICAL for a library
  externals: {
    react: 'react',
    'react-dom': 'react-dom',
  },
};

// --- Build 2: ES Module (ESM) for "module" field ---
const esmConfig = {
  ...commonConfig,
  entry: './index.js', // Your library's main entry
  experiments: {
    outputModule: true,
  },
  output: {
    path: path.join(__dirname, 'module'),
    filename: 'index.js',
    library: {
      type: 'module',
    },
    clean: true,
  },
  // ✅ This is CRITICAL for a library
  externals: {
    react: 'react',
    'react-dom': 'react-dom',
  },
};

module.exports = [cjsConfig, esmConfig];