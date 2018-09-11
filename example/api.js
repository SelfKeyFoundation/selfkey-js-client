const express = require('express');
const Users = require('./users');
const router = express.Router();
const generateNonce = (req, res) => {
	res.json({ nonce: '12345' });
};

const auth = (req, res) => {
	const { body } = req;
	if (!body.publicKey) {
		return res.status(400).json({
			code: 'publick_key_missing',
			message: 'No public key in auth request'
		});
	}
	let user = Users.findByPublicKey(body.publicKey);

	if (body.attributes && body.attributes.length) {
		let data = body.attributes.reduce((acc, curr) => {
			acc[curr.key] = curr.data && curr.data.value ? curr.data.value : curr.data;
			return acc;
		}, {});

		if (user) {
			console.log('updating user');
			user = Users.update(user.id, data);
		} else {
			user = Users.create(data, body.publicKey);
		}
	}

	if (!user) {
		console.log({
			code: 'could_not_authorize',
			message: 'Could not authorize user'
		});
		return res.status(401).json({
			code: 'could_not_authorize',
			message: 'Could not authorize user'
		});
	}
	console.log({ token: user.id });
	return res.json({ token: user.id });
};

const login = (req, res) => {
	const { body } = req;
	const user = Users.findById(body.token);
	if (!user) {
		return res.status(401).json({ redirectTo: '/failure.html' });
	}
	res.json({ redirectTo: '/success.html' });
};

router.get('/', generateNonce);
router.post('/', auth);
router.post('/login', login);

module.exports = router;
