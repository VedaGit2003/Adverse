const express = require('express');
const router = express.Router();
const {
  getNearbyHoardings,
  getAllHoardings,
  getHoardingById,
  createHoarding,
  updateHoarding,
  updateHoardingStatus,
  deleteHoarding,
  getMyHoardings,
  getWBLocations,
  deleteHoardingPhoto,
  requestCoverPhotoDelete,
  parseMapLink
} = require('./hoarding.controller');
const { verifyToken, authorizeRoles, requireApprovedSeller } = require('../../middlewares/auth.middleware');

router.get('/locations', getWBLocations);
router.get('/nearby', getNearbyHoardings);
router.get('/', getAllHoardings);
router.get('/my-sites', verifyToken, authorizeRoles('seller', 'admin'), getMyHoardings);
router.post('/parse-map-link', verifyToken, parseMapLink);
router.get('/:id', getHoardingById);

router.post('/', verifyToken, authorizeRoles('seller', 'admin'), requireApprovedSeller, createHoarding);
router.put('/:id', verifyToken, authorizeRoles('seller', 'admin'), updateHoarding);
router.put('/:id/status', verifyToken, authorizeRoles('seller', 'admin'), updateHoardingStatus);
router.delete('/:id', verifyToken, authorizeRoles('seller', 'admin'), deleteHoarding);
router.delete('/:id/photos', verifyToken, authorizeRoles('seller', 'admin'), deleteHoardingPhoto);
router.post('/:id/request-cover-delete', verifyToken, authorizeRoles('seller', 'admin'), requestCoverPhotoDelete);

module.exports = router;
