const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: {
      background: './src/background/index.ts',
      content: './src/content/index.ts',
      options: './src/options/options.ts',
      popup: './src/popup/popup.ts'
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/
        },
        {
          // 面板样式以字符串形式导入，再注入 Shadow DOM（无需 style-loader）
          test: /\.css$/,
          type: 'asset/source'
        }
      ]
    },
    resolve: {
      extensions: ['.ts', '.js']
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: 'manifest.json', to: 'manifest.json' },
          { from: 'options.html', to: 'options.html' },
          { from: 'popup.html', to: 'popup.html' },
          { from: 'src/styles/panel.css', to: 'panel.css' },
          { from: 'src/styles/pages.css', to: 'pages.css' },
          {
            // 只复制扩展图标，README 截图不进入产物
            from: 'images',
            to: 'images',
            globOptions: { ignore: ['**/1.png', '**/2.png', '**/3.png', '**/4.png'] }
          }
        ]
      })
    ],
    devtool: isProduction ? false : 'cheap-module-source-map',
    performance: { hints: false }
  };
};
