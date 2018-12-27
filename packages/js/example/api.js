const express = require('express');
const Users = require('./users');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const ethUtil = require('eth-util');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const JWT_SECRET = 'SHHH';

const login = (req, res) => {
	const { body } = req;
	if (!body.token) {
		return res.status(400).json({ redirectTo: '/failure.html?error=No+Token' });
	}
	try {
		let decoded = jwt.verify(body.token, JWT_SECRET);
		let user = Users.findById(decoded.subject);
		if (!user) {
			return res.status(404).json({ redirectTo: '/failure.html?error=No+User' });
		}
		return res.json({ redirectTo: '/success.html' });
	} catch (error) {
		return res.satus(401).json({ redirectTo: `/failure.html?error=Invalid+Token` });
	}
};

const jwtAuthMiddleware = (req, res, next) => {
	let auth = req.headers.authorization;
	if (!auth)
		return res
			.status(400)
			.json({ code: 'no_auth_token', message: 'Invalid request. No authentication token' });
	try {
		let decoded = jwt.verify(auth, JWT_SECRET);
		req.decodedAuth = decoded;
		if (!ethUtil.isValidPublic(req.decodedAuth.sub)) {
			return res.status(400).json({
				code: 'invalid_token',
				message: 'Subject should contain a valid public key'
			});
		}
		next();
	} catch (error) {
		return res
			.status(401)
			.json({ code: 'invalid_auth_token', message: 'Invalid autentication token' });
	}
};

const serviceAuthMiddleware = (req, res, next) => {
	if (req.decodedAuth.challange) {
		return res.status(400).json({
			code: 'invalid_token',
			message: 'Challange token is ment only for challange endpoint'
		});
	}
	next();
};

const generateChallange = (req, res) => {
	let publicKey = req.param('publicKey');
	if (!publicKey || !ethUtil.isValidPublic(publicKey)) {
		return res
			.statu(400)
			.json({ code: 'invalid_public_key', message: 'Invalid public key provided' });
	}
	let challange = crypto.randomBytes(48).toString('hex');
	let jwtToken = jwt.sing({ challange }, JWT_SECRET, { expiresIn: '5m', subject: publicKey });
	return res.json({ jwt: jwtToken });
};
const handleChallangeResponse = (req, res) => {
	let challange = req.decodedAuth.challange;
	let publicKey = req.decodedAuth.sub;
	if (!challange) {
		return res
			.status(401)
			.json({ code: 'invalid_auth_token', message: 'Invalid autentication token' });
	}
	let { signature } = req.body || {};
	if (!signature) {
		return res.status(400).json({ code: 'no_signature', message: 'No signature provided' });
	}
	let calculatedPublicKey;
	try {
		const msgHash = ethUtil.hashPersonalMessage(Buffer.from(challange, 'hex'));
		const sig = ethUtil.fromRpcSig(signature);
		const signatureRecover = ethUtil.ecrecover(msgHash, sig.v, sig.r, sig.s);
		calculatedPublicKey = ethUtil.publicToAddress(signatureRecover, true).toString('hex');
	} catch (err) {
		return res
			.status(401)
			.json({ code: 'invalid_signature', message: 'Invalid signature provided' });
	}

	if (!calculatedPublicKey || !ethUtil.isValidPublic(Buffer.from(calculatedPublicKey, 'hex'))) {
		return res
			.status(401)
			.json({ code: 'no_public_key', message: "Couldn't derive public key from signature" });
	}
	if (calculatedPublicKey !== publicKey) {
		return res
			.status(401)
			.json({ code: 'invalid_signature', message: 'Invalid signature provided' });
	}
	let token = jwt.sign({}, JWT_SECRET, { expiresIn: '1h', subject: publicKey });
	return res.json({ jwt: token });
};
const createUser = (req, res) => {
	// TODO: implement with multipart/form data
	res.satus(400).json({ code: 'not_implemented' });

	// const { body } = req;
	// if (!body.publicKey) {
	// 	return res.status(400).json({
	// 		code: 'publick_key_missing',
	// 		message: 'No public key in auth request'
	// 	});
	// }
	// let user = Users.findByPublicKey(body.publicKey);

	// if (body.attributes && body.attributes.length) {
	// 	let data = body.attributes.reduce((acc, curr) => {
	// 		acc[curr.key] = curr.data && curr.data.value ? curr.data.value : curr.data;
	// 		return acc;
	// 	}, {});

	// 	if (user) {
	// 		console.log('updating user');
	// 		user = Users.update(user.id, data);
	// 	} else {
	// 		user = Users.create(data, body.publicKey);
	// 	}
	// }

	// if (!user) {
	// 	console.log({
	// 		code: 'could_not_authorize',
	// 		message: 'Could not authorize user'
	// 	});
	// 	return res.status(401).json({
	// 		code: 'could_not_authorize',
	// 		message: 'Could not authorize user'
	// 	});
	// }
	// console.log({ token: user.id });
	// return res.json({ token: user.id });
};
const getUserPayload = (req, res) => {
	let publicKey = req.decodedAuth.sub;
	let user = Users.findByPublicKey(publicKey);

	if (!user) {
		return res.status(404).json({
			code: 'user_does_not_exist',
			message: 'User with provided public key does not exist'
		});
	}

	let userToken = jwt.sign({}, JWT_SECRET, { subject: user.id });

	return res.send({ token: userToken });
};

router.get('/auth/challange/:publicKey', generateChallange);
router.post('/auth/challange', jwtAuthMiddleware, handleChallangeResponse);
router.post('/users', jwtAuthMiddleware, serviceAuthMiddleware, upload.any(), createUser);
router.post('/auth/token', jwtAuthMiddleware, serviceAuthMiddleware, getUserPayload);
router.post('/login', login);

module.exports = router;
