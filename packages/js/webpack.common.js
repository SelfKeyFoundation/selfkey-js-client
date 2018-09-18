const path = require('path');

module.exports = {
	entry: {
		lws: './src/index.js'
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
	output: {
		filename: '[name].js',
		path: path.resolve(__dirname, 'dist'),
		library: 'lws',
		libraryTarget: 'umd'
	}
};
