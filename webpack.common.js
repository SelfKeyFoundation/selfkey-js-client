const path = require('path');
const CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = {
	entry: {
		'lws-sdk': './src/index.js'
	},
	target: 'web',
	module: {
		rules: [
			{
				test: /\.css$/,
				include: [path.resolve(__dirname, 'src/styles')],
				use: ['style-loader', 'css-loader']
			},
			{
				test: /\.scss$/,
				include: [path.resolve(__dirname, 'src/styles')],
				use: ['style-loader', 'css-loader', 'sass-loader']
			},
			{
				test: /\.svg$/,
				include: [path.resolve(__dirname, 'src/images')],
				loader: 'svg-inline-loader'
			},
			{
				test: /\.(png|gif|jpg|eot|ttf|woff|woff2)$/,
				include: [path.resolve(__dirname, 'src/images')],
				use: [
					{
						loader: 'url-loader',
						options: {
							limit: undefined
						}
					}
				]
			}
		]
	},
	plugins: [new CleanWebpackPlugin(['dist'])],
	output: {
		filename: '[name].js',
		path: path.resolve(__dirname, 'dist'),
		library: 'lws',
		libraryTarget: 'umd'
	}
};
