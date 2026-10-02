const express = require('express');
const router = express.Router();
const {
  getNearbyHoardings,
  getAllHoardings,
  getHoardingById,
  createHoarding,
  updateHoarding,
  deleteHoarding,
  getMyHoardings
} = require('./hoarding.controller');
const { verifyToken, authorizeRoles } = require('../../middlewares/auth.middleware');

router.get('/nearby', getNearbyHoardings);
router.get('/', getAllHoardings);
router.get('/my-sites', verifyToken, authorizeRoles('seller', 'admin'), getMyHoardings);
router.get('/:id', getHoardingById);

router.post('/', verifyToken, authorizeRoles('seller', 'admin'), createHoarding);
router.put('/:id', verifyToken, authorizeRoles('seller', 'admin'), updateHoarding);
router.delete('/:id', verifyToken, authorizeRoles('seller', 'admin'), deleteHoarding);

module.exports = router;
