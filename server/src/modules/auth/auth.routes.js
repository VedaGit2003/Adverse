const express = require('express');
const router = express.Router();
const { register, login, ssoLogin, getMe, updateProfile } = require('./auth.controller');
const { verifyToken } = require('../../middlewares/auth.middleware');

router.post('/register', register);
router.post('/login', login);
router.post('/sso', ssoLogin);
router.get('/me', verifyToken, getMe);
router.put('/profile', verifyToken, updateProfile);

module.exports = router;
