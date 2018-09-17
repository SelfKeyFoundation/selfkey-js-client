const path = require('path');

module.exports = {
	entry: {
		'lws-angular-client': './src/index.js'
	},
	target: 'web',
	module: {
		rules: [
			{
				test: /\.js$/,
				use: {
					loader: 'babel-loader',
					options: {
						compact: false
					}
				}
			}
		]
	},
	output: {
		filename: '[name].js',
		path: path.resolve(__dirname, 'dist'),
		library: 'lwsAngular',
		libraryTarget: 'umd',
		umdNamedDefine: true
	},
	externals: {
		angular: {
			commonjs: 'angular',
			commonjs2: 'angular',
			amd: 'angular',
			root: 'angular'
		}
	}
};
