const express = require('express');
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  getBookingById,
  handleSellerApproval,
  processBookingPayment,
  updateMountingPhase,
  uploadMountingProof,
  verifyMountingProof,
  adminOverrideBooking,
  updateBookingStatus,
  updateCampaignCreative
} = require('./booking.controller');
const { verifyToken, authorizeRoles } = require('../../middlewares/auth.middleware');

// Public / User routes
router.post('/', verifyToken, createBooking);
router.get('/', verifyToken, getMyBookings);
router.get('/my-bookings', verifyToken, getMyBookings);
router.get('/:id', verifyToken, getBookingById);

// Step 2: Seller/Admin Approval (Unlocks payment)
router.put('/:id/seller-approval', verifyToken, authorizeRoles('seller', 'admin'), handleSellerApproval);

// Step 3: Customer Payment (Initiates 3-day mounting window & notifies seller & admin)
router.post('/:id/pay', verifyToken, processBookingPayment);

// Mounting Window Phases 1 & 2 (Flex Pick up & Mounting)
router.put('/:id/mounting-phase', verifyToken, authorizeRoles('seller', 'admin'), updateMountingPhase);

// Mounting Window Phase 3: Confirmation (Seller uploads proof photo with date & time -> Starts 4-hour countdown)
router.post('/:id/mounting-proof', verifyToken, authorizeRoles('seller', 'admin'), uploadMountingProof);
router.put('/:id/mounting-proof', verifyToken, authorizeRoles('seller', 'admin'), uploadMountingProof);

// 4-Hour Verification Window (Customer or Admin verifies -> Officially begins subscription date)
router.put('/:id/verify-mounting', verifyToken, verifyMountingProof);

// Admin Full Rights Override
router.put('/:id/admin-override', verifyToken, authorizeRoles('admin'), adminOverrideBooking);

// Legacy/Compat
router.put('/:id/status', verifyToken, authorizeRoles('seller', 'admin'), updateBookingStatus);
router.put('/:id/creative', verifyToken, updateCampaignCreative);

module.exports = router;
