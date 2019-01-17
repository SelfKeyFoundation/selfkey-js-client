const webpack = require('webpack');
const middleware = require('webpack-dev-middleware');
const compiler = webpack(require('../webpack.dev'));
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const api = require('./api');
const app = express();
const Users = require('./users');
const Documents = require('./documents');
const HOST = `http://localhost:${process.env.PORT}`;

app.use(middleware(compiler, {}));
app.use(bodyParser.json({ limit: '300mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/v1/selfkey', api);
app.get('/users', (req, res) => {
	res.json(Users.findAll());
});
app.get('/documents/:id', (req, res) => {
	let doc = Documents.findById(req.params.id);
	if (!doc) return res.status(404).send;
	res.setHeader('Content-Transfer-Encoding', 'binary');
	res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
	res.send(doc.content);
});
app.get('/documents', (req, res) => {
	res.json(
		Documents.findAll().map(doc => ({
			...doc,
			content: `${HOST}/documents/${doc.id}`
		}))
	);
});
app.listen(process.env.PORT || 3000, () => console.log('dev server is listening on 3000'));
