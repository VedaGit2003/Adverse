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
  updateCampaignCreative,
  requestRemounting,
  payRemounting,
  updateRemountingStatus,
  uploadRemountingProof,
  verifyRemountingProof
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

// ============================================================================
// FLEX REMOUNTING ROUTES (₹3/SQ.FT PIPELINE & ADMIN FULL RIGHTS STATUS)
// ============================================================================
// Step 1: Customer or Admin requests new flex remounting (₹3/sq.ft charge)
router.post('/:id/remounting', verifyToken, requestRemounting);

// Step 2: Customer or Admin pays remounting fee
router.post('/:id/remounting/:requestId/pay', verifyToken, payRemounting);

// Step 3 & Beyond: Admin has all rights to set status; Seller can update operational phases
router.put('/:id/remounting/:requestId/status', verifyToken, authorizeRoles('seller', 'admin'), updateRemountingStatus);

// Replacement proof photo upload (Seller / Admin)
router.post('/:id/remounting/:requestId/proof', verifyToken, authorizeRoles('seller', 'admin'), uploadRemountingProof);

// Verification of remounting (Customer / Admin)
router.put('/:id/remounting/:requestId/verify', verifyToken, verifyRemountingProof);

// Admin Full Rights Override
router.put('/:id/admin-override', verifyToken, authorizeRoles('admin'), adminOverrideBooking);

// Legacy/Compat
router.put('/:id/status', verifyToken, authorizeRoles('seller', 'admin'), updateBookingStatus);
router.put('/:id/creative', verifyToken, updateCampaignCreative);

module.exports = router;
