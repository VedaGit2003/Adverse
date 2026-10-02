const express = require('express');
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  getBookingById,
  updateBookingStatus,
  updateCampaignCreative
} = require('./booking.controller');
const { verifyToken, authorizeRoles } = require('../../middlewares/auth.middleware');

router.post('/', verifyToken, createBooking);
router.get('/', verifyToken, getMyBookings);
router.get('/:id', verifyToken, getBookingById);
router.put('/:id/status', verifyToken, authorizeRoles('seller', 'admin'), updateBookingStatus);
router.put('/:id/creative', verifyToken, updateCampaignCreative);

module.exports = router;
