const express = require('express');
const router = express.Router();
const {
  recordOfflinePayment,
  verifyPayment,
  rejectPayment,
  getAllPayments
} = require('./payment.controller');
const { verifyToken, authorizeRoles } = require('../../middlewares/auth.middleware');

router.post('/offline', verifyToken, recordOfflinePayment);
router.put('/:id/verify', verifyToken, authorizeRoles('seller', 'admin'), verifyPayment);
router.put('/:id/reject', verifyToken, authorizeRoles('seller', 'admin'), rejectPayment);
router.get('/', verifyToken, authorizeRoles('seller', 'admin'), getAllPayments);

module.exports = router;
