const webpack = require('webpack');
const middleware = require('webpack-dev-middleware');
const compiler = webpack(require('../webpack.dev'));
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const api = require('./api');

const app = express();

app.use(middleware(compiler, {}));
app.use(bodyParser.json({ limit: '300mb' }));
// app.use(bodyParser.json({ limit: '300mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/v1/selfkey', api);
app.listen(process.env.PORT || 3000, () => console.log('dev server is listening on 3000'));
