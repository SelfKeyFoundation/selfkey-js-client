const merge = require('webpack-merge');
const common = require('./webpack.common');
const path = require('path');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = merge.smart(common, {
	mode: 'production',
	entry: {
		'lws-angularjs-client.min': './src/index.js'
	},
	plugins: [new CleanWebpackPlugin(['dist'], { beforeEmit: true })],
	optimization: {
		minimize: true,
		minimizer: [
			new UglifyJsPlugin({
				include: /\.min\.js$/
			})
		]
	},
	resolve: {
		alias: {
			angular: path.resolve(__dirname, './node_modules/angular')
		}
	}
});
