const path = require('path');

module.exports = {
	entry: {
		'lws-react-client': './src/index.js'
	},
	target: 'web',
	module: {
		rules: [
			{
				test: /\.js$/,
				include: [path.resolve(__dirname, 'src/')],
				use: ['babel-loader']
			}
		]
	},
	output: {
		filename: '[name].js',
		path: path.resolve(__dirname, 'dist'),
		library: 'lwsReact',
		libraryTarget: 'umd',
		umdNamedDefine: true
	}
};
