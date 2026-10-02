const express = require('express');
const router = express.Router();
const { getPlatformMetrics, getUsers, moderateHoarding } = require('./admin.controller');
const { verifyToken, authorizeRoles } = require('../../middlewares/auth.middleware');

router.use(verifyToken);
router.use(authorizeRoles('admin'));

router.get('/metrics', getPlatformMetrics);
router.get('/users', getUsers);
router.put('/hoardings/:id/approve', moderateHoarding);

module.exports = router;
