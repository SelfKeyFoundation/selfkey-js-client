const path = require('path');

const { VueLoaderPlugin } = require('vue-loader');

module.exports = {
	entry: {
		'lws-vue-client': './src/index.js'
	},
	target: 'web',
	module: {
		rules: [
			{
				test: /\.vue$/,
				use: 'vue-loader'
			},
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
	plugins: [new VueLoaderPlugin()],
	output: {
		filename: '[name].js',
		path: path.resolve(__dirname, 'dist'),
		library: 'lwsVue',
		libraryTarget: 'umd',
		umdNamedDefine: true
	},
	externals: {
		vue: {
			commonjs: 'vue',
			commonjs2: 'vue',
			amd: 'Vue',
			root: 'Vue'
		}
	}
};
