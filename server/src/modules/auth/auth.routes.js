const express = require('express');
const router = express.Router();
const { register, login, getMe, updateProfile } = require('./auth.controller');
const { verifyToken } = require('../../middlewares/auth.middleware');

router.post('/register', register);
router.post('/login', login);
router.get('/me', verifyToken, getMe);
router.put('/profile', verifyToken, updateProfile);

module.exports = router;
