const express = require('express');
const Users = require('./users');
const Documents = require('./documents');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const ethUtil = require('ethereumjs-util');
const multer = require('multer');
const upload = multer();
const JWT_SECRET = 'SHHH';
const HOST = `http://localhost:${process.env.PORT}`;
const cors = require('cors');
const selfkey = require('@selfkey/node-lib');

const denormalizeDocumentsSchema = (typeSchema, value, documents = [], maxDepth = 10) => {
	if (maxDepth < 0) {
		return { value, documents };
	}

	documents = [...documents];
	if (typeSchema.format === 'file') {
		if (!value || typeof value !== 'string') return { value, documents };
		const refIdRegexp = /#ref{(document[0-9]+).id}$/;
		const idRegexp = /\$document-([0-9]+)$/;

		let id = value.match(refIdRegexp);
		if (!id) id = value.match(idRegexp);
		if (id && id.length) {
			id = id[1];
		}
		if (!id) return { value: null, documents };
		let found = documents.filter(doc => doc.id === +id || doc['#id'] === id);
		let filtered = documents.filter(doc => doc.id !== +id && doc['#id'] !== id);

		value = null;

		if (found.length) {
			value = found[0];
			delete value['#id'];
		}

		return { value, documents: filtered };
	}

	if (typeSchema.type === 'object' && typeof value === 'object') {
		if (!typeSchema.properties) return { value, documents };
		return Object.keys(typeSchema.properties).reduce(
			(acc, key) => {
				if (!value.hasOwnProperty(key)) {
					return acc;
				}
				let denormalized = denormalizeDocumentsSchema(
					typeSchema.properties[key],
					value[key],
					acc.documents,
					maxDepth - 1
				);
				acc.value[key] = denormalized.value;
				acc.documents = denormalized.documents;
				return acc;
			},
			{ value: {}, documents }
		);
	}

	if (typeSchema.type === 'array' && Array.isArray(value)) {
		return value.reduce(
			(acc, itm) => {
				let normalized = denormalizeDocumentsSchema(
					typeSchema.items,
					itm,
					acc.documents,
					maxDepth - 1
				);
				acc.value.push(normalized.value);
				acc.documents = normalized.documents;
				return acc;
			},
			{ value: [], documents }
		);
	}
	return { value, documents };
};

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
			message: 'should contain a valid token'
		});
	}
	auth = auth.replace(/^Bearer /, '');
	try {
		let decoded = jwt.verify(auth, JWT_SECRET);
		req.decodedAuth = decoded;
		console.log('XXX', decoded);
		try {
			if (!selfkey.isSupported(req.decodedAuth.sub)) {
				return res.status(400).json({
					code: 'invalid_did',
					message: 'Subject should contain a valid did'
				});
			}
		} catch (error) {
			return res.status(400).json({
				code: 'invalid_did',
				message: 'Subject should contain a valid did'
			});
		}
		next();
	} catch (error) {
		console.log('XXX', error);
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
	let did = req.params.did;
	try {
		if (!selfkey.isSupported(did)) {
			return res.status(400).json({
				code: 'invalid_did',
				message: 'Should be a valid did'
			});
		}
	} catch (error) {
		return res.status(400).json({
			code: 'invalid_did',
			message: 'Should be a valid did'
		});
	}
	let challenge = crypto.randomBytes(48).toString('hex');
	let jwtToken = jwt.sign({ challenge }, JWT_SECRET, { expiresIn: '5m', subject: did });
	return res.json({ jwt: jwtToken });
};
const handleChallengeResponse = async (req, res) => {
	let challenge = req.decodedAuth.challenge;
	let did = await selfkey.resolve(req.decodedAuth.sub);
	console.log('XXX', did);
	let resolvedAddress = did.publicKey[0].ethereumAddress;
	if (!challenge) {
		return res
			.status(401)
			.json({ code: 'invalid_auth_token', message: 'Invalid autentication token' });
	}
	let { signature } = req.body || {};
	if (!signature) {
		return res.status(400).json({ code: 'no_signature', message: 'No signature provided' });
	}
	let calculatedAddress;
	try {
		const msgHash = ethUtil.hashPersonalMessage(Buffer.from(challenge));
		const sig = ethUtil.fromRpcSig(signature);
		calculatedAddress = ethUtil.bufferToHex(
			ethUtil.pubToAddress(ethUtil.ecrecover(msgHash, sig.v, sig.r, sig.s))
		);
	} catch (err) {
		return res
			.status(401)
			.json({ code: 'invalid_signature', message: 'Invalid signature provided' });
	}

	if (calculatedAddress !== resolvedAddress) {
		return res
			.status(401)
			.json({ code: 'invalid_signature', message: 'Invalid signature provided' });
	}
	let token = jwt.sign({}, JWT_SECRET, { expiresIn: '1h', subject: did.id });
	return res.json({ jwt: token });
};
const createUser = (req, res) => {
	let attributes;
	let meta;
	const isJSON = req.headers['content-type'] === 'application/json';
	if (isJSON) {
		attributes = req.body.attributes;
		meta = req.body.meta;
	} else {
		try {
			attributes = JSON.parse(req.body.attributes);
			meta = JSON.parse(req.body.meta || '{}');
		} catch (error) {
			return res.status(400).json({
				code: 'invalid_attributes',
				message: 'Attributes field must be a json string'
			});
		}
	}

	if (!attributes || !attributes.length) {
		return res.status(400).json({ code: 'no_attributes', message: 'No attributes provided' });
	}
	if (!isJSON) {
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

		documents = documents.map(doc => {
			let newDoc = Documents.create(doc);
			let link = `${HOST}/documents/${newDoc.id}`;
			doc.localId = newDoc.id;
			doc.content = link;
			return doc;
		});

		attributes = attributes.map(attr => {
			let attrDocs = attr.documents
				.map(id => {
					let found = documents.filter(doc => doc.id === id);
					return found.length ? found[0] : null;
				})
				.filter(doc => !!doc);
			attr = { ...attr, documents: attrDocs };
			let { value } = denormalizeDocumentsSchema(attr.schema, attr.data, attrDocs);
			return { id: attr.id, value };
		});
	}

	let did = req.decodedAuth.sub;

	let user = Users.findByDID(did);

	if (user) {
		console.log('updating user');
		user = Users.update(user.id, { attributes, meta });
	} else {
		user = Users.create({ attributes, meta }, did);
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
	let did = req.decodedAuth.sub;
	let user = Users.findByDID(did);

	if (!user) {
		return res.status(404).json({
			code: 'user_does_not_exist',
			message: 'User with provided did does not exist'
		});
	}

	let userToken = jwt.sign({}, JWT_SECRET, { subject: '' + user.id });

	return res.send({ token: userToken });
};

const uploadFile = (req, res) => {
	// fetch file from request
	const f = req.file;

	if (!f) return res.status(400).json({ code: 'no_file', message: 'no file uploaded' });

	// parse file info
	let doc = {
		mimeType: f.mimetype,
		size: f.size,
		content: f.buffer
	};

	// save the document to storage
	doc = Documents.create(doc);

	// respond with document id
	return res.json({ id: doc.id });
};

router.get('/auth/challenge/:did', generateChallenge);
router.post('/auth/challenge', jwtAuthMiddleware, handleChallengeResponse);
router.post('/users', jwtAuthMiddleware, serviceAuthMiddleware, upload.any(), createUser);
router.get('/users/token', jwtAuthMiddleware, serviceAuthMiddleware, getUserPayload);
router.post('/users/file', jwtAuthMiddleware, upload.single('document'), uploadFile);
router.options('/login', cors());
router.post('/login', cors(), login);
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
