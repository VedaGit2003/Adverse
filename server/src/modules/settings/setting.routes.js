const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('./setting.controller');
const { verifyToken, authorizeRoles } = require('../../middlewares/auth.middleware');

// Public / Client read settings
router.get('/', getSettings);

// Admin toggle switch update
router.put('/', verifyToken, authorizeRoles('admin'), updateSettings);

module.exports = router;
