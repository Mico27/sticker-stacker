const path = require("path");
const webpack = require('webpack');
module.exports = {
  mode: 'production',
  context: path.join(__dirname),
  entry: {
    panel: './src/Panel.jsx',
	config: './src/Config.jsx',
	live_config: './src/LiveConfig.jsx',
    core: ["moment", "underscore"],
  },
  output: {
    path: path.resolve(__dirname, "dist"), // output folder
	filename: '[name].bundle.js'
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env", "@babel/preset-react"],
          },
        },
      },
      {
        test: /\.css$/,
        use: [
          "style-loader",
          "css-loader", // for styles
        ],
      },
    ],
  },
  plugins: [
    new webpack.ContextReplacementPlugin(/moment[\/\\]locale$/, /fr/),
    new webpack.ProvidePlugin({
      React: 'react',
      _: "underscore",
      moment: "moment"
    }),
    new webpack.DefinePlugin({
      'process.env.PUBLIC_URL': JSON.stringify('http://localhost/public')
    }),
  ],
};