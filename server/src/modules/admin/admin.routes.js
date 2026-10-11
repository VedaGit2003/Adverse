const express = require('express');
const router = express.Router();
const { 
  getPlatformMetrics, 
  getHoardingsAdmin, 
  getBookingsAdmin, 
  getUsers, 
  getSellersAdmin, 
  moderateHoarding,
  moderateSellerStatus,
  getCoverDeletionRequests,
  moderateCoverDeletionRequest
} = require('./admin.controller');
const { verifyToken, authorizeRoles } = require('../../middlewares/auth.middleware');

router.use(verifyToken);
router.use(authorizeRoles('admin'));

router.get('/metrics', getPlatformMetrics);
router.get('/hoardings', getHoardingsAdmin);
router.get('/bookings', getBookingsAdmin);
router.get('/users', getUsers);
router.get('/sellers', getSellersAdmin);
router.put('/hoardings/:id/approve', moderateHoarding);
router.put('/sellers/:id/status', moderateSellerStatus);
router.get('/cover-deletion-requests', getCoverDeletionRequests);
router.put('/cover-deletion-requests/:id', moderateCoverDeletionRequest);

module.exports = router;
