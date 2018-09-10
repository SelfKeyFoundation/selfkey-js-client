const merge = require('webpack-merge');
const common = require('./webpack.common');
const path = require('path');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = merge.smart(common, {
	mode: 'production',
	entry: {
		'lws-sdk.min': './src/index.js'
	},
	module: {
		rules: [
			{
				test: /\.css$/,
				include: [path.resolve(__dirname, 'src/styles')],
				use: [
					'style-loader',
					'css-loader',
					{
						loader: 'postcss-loader',
						options: {
							ident: 'postcss',
							plugins: loader => [require('cssnano')()]
						}
					}
				]
			},
			{
				test: /\.scss$/,
				include: [path.resolve(__dirname, 'src/styles')],
				use: [
					'style-loader',
					'css-loader',
					{
						loader: 'postcss-loader',
						options: {
							ident: 'postcss',
							plugins: loader => [require('cssnano')()]
						}
					},
					'sass-loader'
				]
			}
		]
	},
	plugins: [new CleanWebpackPlugin(['dist'], { beforeEmit: true })],
	optimization: {
		minimize: true,
		minimizer: [
			new UglifyJsPlugin({
				include: /\.min\.js$/
			})
		]
	}
});
