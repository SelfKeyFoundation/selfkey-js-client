const express = require('express');
const Users = require('./users');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const ethUtil = require('ethereumjs-util');
const multer = require('multer');
const upload = multer();
const JWT_SECRET = 'SHHH';

const login = (req, res) => {
	const { body } = req;
	if (!body.token) {
		return res.status(400).json({ redirectTo: '/failure.html?error=No+Token' });
	}
	try {
		let decoded = jwt.verify(body.token, JWT_SECRET);
		let user = Users.findById(+decoded.sub);
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
	if (!auth) {
		return res
			.status(400)
			.json({ code: 'no_auth_token', message: 'Invalid request. No authentication token' });
	}
	if (!auth.startsWith('Bearer ')) {
		return res.status(400).json({
			code: 'invalid_auth_token',
			message: 'Subject should contain a valid public key'
		});
	}
	auth = auth.replace(/^Bearer /, '');
	try {
		let decoded = jwt.verify(auth, JWT_SECRET);
		req.decodedAuth = decoded;
		if (!ethUtil.isValidPublic(Buffer.from(req.decodedAuth.sub, 'hex'))) {
			return res.status(400).json({
				code: 'invalid_auth_token',
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
	if (req.decodedAuth.challenge) {
		return res.status(400).json({
			code: 'invalid_token',
			message: 'Challenge token is ment only for challenge endpoint'
		});
	}
	next();
};

const generateChallenge = (req, res) => {
	let publicKey = req.params.publicKey;
	if (!publicKey || !ethUtil.isValidPublic(Buffer.from(publicKey, 'hex'))) {
		return res
			.status(400)
			.json({ code: 'invalid_public_key', message: 'Invalid public key provided' });
	}
	let challenge = crypto.randomBytes(48).toString('hex');
	let jwtToken = jwt.sign({ challenge }, JWT_SECRET, { expiresIn: '5m', subject: publicKey });
	return res.json({ jwt: jwtToken });
};
const handleChallengeResponse = (req, res) => {
	let challenge = req.decodedAuth.challenge;
	let publicKey = req.decodedAuth.sub;
	if (!challenge) {
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
		const msgHash = ethUtil.hashPersonalMessage(Buffer.from(challenge));
		const sig = ethUtil.fromRpcSig(signature);
		calculatedPublicKey = ethUtil.ecrecover(msgHash, sig.v, sig.r, sig.s).toString('hex');
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
	let attributes = req.body.attributes;

	try {
		attributes = JSON.parse(attributes);
	} catch (error) {
		return res.status(400).json({
			code: 'invalid_attributes',
			message: 'Attributes field must be a json string'
		});
	}

	if (!attributes || !attributes.length) {
		return res.status(400).json({ code: 'no_attributes', message: 'No attributes provided' });
	}

	let documents = req.files.map(f => {
		let doc = {
			mimeType: f.mimetype,
			size: f.size,
			content: f.buffer
		};
		let id = f.fieldname.match(/^\$document-([0-9]*)$/);
		if (id) doc.id = +id[1];
		return doc;
	});

	attributes = attributes.map(attr => {
		console.log('XXX', attr.documents);
		let attrDocs = attr.documents
			.map(id => {
				let found = documents.filter(doc => doc.id === id);
				return found.length ? found[0] : null;
			})
			.filter(doc => !!doc);
		return { ...attr, documents: attrDocs };
	});

	let publicKey = req.decodedAuth.sub;

	let user = Users.findByPublicKey(publicKey);

	if (user) {
		console.log('updating user');
		user = Users.update(user.id, { attributes });
	} else {
		user = Users.create({ attributes }, publicKey);
	}

	if (!user) {
		return res.status(400).json({
			code: 'could_not_create',
			message: 'Could not create user'
		});
	}

	return res.status(201).send();
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

	let userToken = jwt.sign({}, JWT_SECRET, { subject: '' + user.id });

	return res.send({ token: userToken });
};

router.get('/auth/challenge/:publicKey', generateChallenge);
router.post('/auth/challenge', jwtAuthMiddleware, handleChallengeResponse);
router.post('/users', jwtAuthMiddleware, serviceAuthMiddleware, upload.any(), createUser);
router.get('/auth/token', jwtAuthMiddleware, serviceAuthMiddleware, getUserPayload);
router.post('/login', login);
router.use((error, req, res, next) => {
	console.error(error);
	return res.status(500).json({
		code: 'unhandled_error',
		message: error.message
	});
});

module.exports = router;

// let attrs = [
// 	{
// 		id: 'http://platform.selfkey.org/schema/attribute/first-name.json',
// 		data: 'Maxim',
// 		schema: {
// 			$id: 'http://platform.selfkey.org/schema/attribute/first-name.json',
// 			$schema: 'http://platform.selfkey.org/schema/identity-attribute.json',
// 			identityAttribute: true,
// 			identityAttributeRepository: 'http://platform.selfkey.org/repository.json',
// 			title: 'First Name',
// 			description: "An individual's first (given) name.",
// 			type: 'string'
// 		},
// 		documents: []
// 	},
// 	{
// 		id: 'http://platform.selfkey.org/schema/attribute/last-name.json',
// 		data: 'Kovalov',
// 		schema: {
// 			$id: 'http://platform.selfkey.org/schema/attribute/last-name.json',
// 			$schema: 'http://platform.selfkey.org/schema/identity-attribute.json',
// 			identityAttribute: true,
// 			identityAttributeRepository: 'http://platform.selfkey.org/repository.json',
// 			title: 'Last Name',
// 			description: "An individual's last (family) name.",
// 			type: 'string'
// 		},
// 		documents: []
// 	},
// 	{
// 		id: 'http://platform.selfkey.org/schema/attribute/national-id.json',
// 		data: { front: '$document-1', back: '$document-7' },
// 		schema: {
// 			$id: 'http://platform.selfkey.org/schema/attribute/national-id.json',
// 			$schema: 'http://platform.selfkey.org/schema/identity-attribute.json',
// 			identityAttribute: true,
// 			identityAttributeRepository: 'http://platform.selfkey.org/repository.json',
// 			title: 'National ID',
// 			description: 'A copy of a national identification document.',
// 			type: 'object',
// 			properties: {
// 				front: {
// 					title: 'Front image',
// 					$schema: 'http://json-schema.org/draft-07/schema',
// 					$id: 'http://platform.selfkey.org/schema/document/image.json',
// 					type: 'object',
// 					format: 'file',
// 					properties: {
// 						mimeType: {
// 							type: 'string',
// 							enum: ['image/jpg', 'image/png', 'application/pdf']
// 						},
// 						size: { type: 'integer', max: 50000000 },
// 						content: { type: 'string' }
// 					},
// 					required: ['mimeType', 'size', 'content']
// 				},
// 				back: {
// 					title: 'Back image',
// 					$schema: 'http://json-schema.org/draft-07/schema',
// 					$id: 'http://platform.selfkey.org/schema/document/image.json',
// 					type: 'object',
// 					format: 'file',
// 					properties: {
// 						mimeType: {
// 							type: 'string',
// 							enum: ['image/jpg', 'image/png', 'application/pdf']
// 						},
// 						size: { type: 'integer', max: 50000000 },
// 						content: { type: 'string' }
// 					},
// 					required: ['mimeType', 'size', 'content']
// 				},
// 				additional: {
// 					type: 'array',
// 					title: 'Additional images',
// 					items: {
// 						$schema: 'http://json-schema.org/draft-07/schema',
// 						$id: 'http://platform.selfkey.org/schema/document/image.json',
// 						type: 'object',
// 						title: 'Image',
// 						format: 'file',
// 						properties: {
// 							mimeType: {
// 								type: 'string',
// 								enum: ['image/jpg', 'image/png', 'application/pdf']
// 							},
// 							size: { type: 'integer', max: 50000000 },
// 							content: { type: 'string' }
// 						},
// 						required: ['mimeType', 'size', 'content']
// 					}
// 				}
// 			},
// 			required: ['front']
// 		},
// 		documents: [1, 7]
// 	}
// ];
// { fieldname: '$document-1',
// originalname: 'Screen Shot 2018-12-26 at 14.45.07.png',
// encoding: '7bit',
// mimetype: 'image/png',
// buffer: <Buffer 30 30 30 30 30>,
// size: 5 },
