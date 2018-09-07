const express = require('express');
const router = express.Router();

const generateNonce = (req, res) => {
	res.json({ nonce: '12345' });
};

const auth = (req, res) => {
	console.log(req.body);
	res.json({ token: '1234' });
};

const login = (req, res) => {
	res.json({ redirectTo: '/success.html' });
};

router.get('/', generateNonce);
router.post('/', auth);
router.post('/login', login);

module.exports = router;
