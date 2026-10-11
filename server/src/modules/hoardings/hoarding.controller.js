const Hoarding = require('../../models/Hoarding');
const Booking = require('../../models/Booking');
const Payment = require('../../models/Payment');
const { resolveWBCoordinates, calculateDistanceKm, WB_CITIES } = require('../../utils/geo');
const { deleteFromCloudinary } = require('../../utils/cloudinary');

exports.getNearbyHoardings = async (req, res, next) => {
  try {
    let { lat, lng, location, radius = 30, lightingType, hoardingType, minPrice, maxPrice, status } = req.query;

    let targetLat = lat ? parseFloat(lat) : null;
    let targetLng = lng ? parseFloat(lng) : null;
    let resolvedCityName = null;

    if ((!targetLat || !targetLng) && location) {
      const resolved = resolveWBCoordinates(location);
      if (resolved) {
        targetLat = resolved.lat;
        targetLng = resolved.lng;
        resolvedCityName = resolved.name;
      }
    }

    const filter = { isApprovedByAdmin: true };

    if (status) {
      filter.availabilityStatus = status;
    } else {
      filter.availabilityStatus = { $in: ['available', 'occupied'] };
    }

    if (lightingType) filter.lightingType = lightingType;
    if (hoardingType) filter.hoardingType = hoardingType;
    if (minPrice || maxPrice) {
      filter['pricing.baseRatePerMonth'] = {};
      if (minPrice) filter['pricing.baseRatePerMonth'].$gte = Number(minPrice);
      if (maxPrice) filter['pricing.baseRatePerMonth'].$lte = Number(maxPrice);
    }

    let hoardings = [];

    if (targetLat && targetLng) {
      const radiusInMeters = parseFloat(radius) * 1000;
      filter['location.geo'] = {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [targetLng, targetLat]
          },
          $maxDistance: radiusInMeters
        }
      };

      hoardings = await Hoarding.find(filter)
        .populate('sellerId', 'name email phone companyDetails')
        .lean();

      hoardings = hoardings.map(h => {
        const hLng = h.location.geo.coordinates[0];
        const hLat = h.location.geo.coordinates[1];
        const dist = calculateDistanceKm(targetLat, targetLng, hLat, hLng);
        return { ...h, distanceKm: dist };
      });
    } else {
      if (location) {
        filter.$or = [
          { 'location.city': { $regex: location, $options: 'i' } },
          { 'location.address': { $regex: location, $options: 'i' } },
          { title: { $regex: location, $options: 'i' } }
        ];
      }

      hoardings = await Hoarding.find(filter)
        .populate('sellerId', 'name email phone companyDetails')
        .sort({ createdAt: -1 })
        .lean();
    }

    res.status(200).json({
      success: true,
      count: hoardings.length,
      searchedLocation: resolvedCityName || location || (targetLat ? `${targetLat}, ${targetLng}` : 'All West Bengal'),
      coordinates: targetLat && targetLng ? { lat: targetLat, lng: targetLng } : null,
      radiusKm: parseFloat(radius),
      hoardings
    });
  } catch (error) {
    next(error);
  }
};

exports.getAllHoardings = async (req, res, next) => {
  try {
    const { city, lightingType, hoardingType, status, minPrice, maxPrice, search, page = 1, limit = 20 } = req.query;
    const filter = { isApprovedByAdmin: true };

    if (city) filter['location.city'] = { $regex: city, $options: 'i' };
    if (lightingType) filter.lightingType = lightingType;
    if (hoardingType) filter.hoardingType = hoardingType;
    if (status) filter.availabilityStatus = status;

    if (minPrice || maxPrice) {
      filter['pricing.baseRatePerMonth'] = {};
      if (minPrice) filter['pricing.baseRatePerMonth'].$gte = Number(minPrice);
      if (maxPrice) filter['pricing.baseRatePerMonth'].$lte = Number(maxPrice);
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { 'location.address': { $regex: search, $options: 'i' } },
        { 'location.city': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Hoarding.countDocuments(filter);
    const hoardings = await Hoarding.find(filter)
      .populate('sellerId', 'name email phone companyDetails')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: hoardings.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      hoardings
    });
  } catch (error) {
    next(error);
  }
};

exports.getHoardingById = async (req, res, next) => {
  try {
    const hoarding = await Hoarding.findById(req.params.id).populate(
      'sellerId',
      'name email phone companyDetails'
    );

    if (!hoarding) {
      return res.status(404).json({ success: false, message: 'Hoarding site not found.' });
    }

    hoarding.viewCount += 1;
    await hoarding.save({ validateBeforeSave: false });

    const activeBookings = await Booking.find({
      hoardingId: hoarding._id,
      bookingStatus: { $in: ['confirmed', 'active'] },
      endDate: { $gte: new Date() }
    }).select('startDate endDate bookingNumber');

    res.status(200).json({ success: true, hoarding, bookedSlots: activeBookings });
  } catch (error) {
    next(error);
  }
};

exports.createHoarding = async (req, res, next) => {
  try {
    if (req.user?.role === 'customer') {
      return res.status(403).json({
        success: false,
        message: 'Clients (Advertisers) are not allowed to enlist new hoarding sites. Only accredited Media Owners (Sellers) have enlistment privileges.'
      });
    }

    const { title, description, hoardingType, lightingType, dimensions, location, pricing, photos } = req.body;

    if (!dimensions || !dimensions.width || !dimensions.height) {
      return res.status(400).json({ success: false, message: 'Please provide dimensions (width and height in feet).' });
    }

    if (!location || !location.address || !location.city) {
      return res.status(400).json({ success: false, message: 'Please provide complete location details.' });
    }

    let coordinates = location.geo?.coordinates;
    if (!coordinates || coordinates.length < 2 || (!coordinates[0] && !coordinates[1])) {
      const resolved = resolveWBCoordinates(location.city) || WB_CITIES.kolkata;
      coordinates = [resolved.lng, resolved.lat];
    }

    const newHoarding = await Hoarding.create({
      sellerId: req.user.id,
      title,
      description,
      hoardingType: hoardingType || 'Billboard',
      lightingType: lightingType || 'Frontlit',
      dimensions: {
        width: dimensions.width,
        height: dimensions.height,
        unit: dimensions.unit || 'feet'
      },
      location: {
        address: location.address,
        city: location.city,
        district: location.district || '',
        landmark: location.landmark || '',
        pincode: location.pincode || '',
        geo: {
          type: 'Point',
          coordinates: [parseFloat(coordinates[0]), parseFloat(coordinates[1])]
        },
        googleMapsUrl: location.googleMapsUrl || req.body.googleMapsUrl || ''
      },
      pricing: {
        baseRatePerMonth: pricing.baseRatePerMonth,
        baseRatePerDay: pricing.baseRatePerDay || Math.round(pricing.baseRatePerMonth / 30),
        minimumBookingDays: pricing.minimumBookingDays || 15,
        printingCostEstimate: pricing.printingCostEstimate || 0,
        mountingCostEstimate: pricing.mountingCostEstimate || 0
      },
      photos: photos || [],
      isApprovedByAdmin: true
    });

    res.status(201).json({ success: true, message: 'Hoarding site enlisted successfully.', hoarding: newHoarding });
  } catch (error) {
    next(error);
  }
};

/**
 * Checks if a hoarding is locked under booking, 3-day mounting window, payment initiated, or booked/occupied.
 * Returns { requiresApproval: boolean, lockReason: string }
 */
async function checkHoardingRequiresApproval(hoarding) {
  // 1. Explicitly occupied/booked
  if (hoarding.availabilityStatus === 'occupied') {
    return {
      requiresApproval: true,
      lockReason: 'booked / occupied'
    };
  }

  // 2. Any active or in-progress bookings on this hoarding
  const activeBookings = await Booking.find({
    hoardingId: hoarding._id,
    bookingStatus: {
      $in: [
        'requested',
        'approved',
        'confirmed',
        'mounting_window',
        'verification_pending',
        'active'
      ]
    }
  });

  if (activeBookings && activeBookings.length > 0) {
    const hasMounting = activeBookings.some(b => b.bookingStatus === 'mounting_window');
    const hasVerification = activeBookings.some(b => b.bookingStatus === 'verification_pending');
    const hasActive = activeBookings.some(b => b.bookingStatus === 'active');
    const hasConfirmed = activeBookings.some(b => b.bookingStatus === 'confirmed');

    if (hasMounting) {
      return { requiresApproval: true, lockReason: 'in 3-day mounting period' };
    }
    if (hasVerification) {
      return { requiresApproval: true, lockReason: 'under customer mounting verification' };
    }
    if (hasActive) {
      return { requiresApproval: true, lockReason: 'under an active campaign' };
    }
    if (hasConfirmed) {
      return { requiresApproval: true, lockReason: 'under a confirmed booking' };
    }
    return { requiresApproval: true, lockReason: 'under booking reservation process' };
  }

  // 3. Any initiated payments for this hoarding
  const allBookings = await Booking.find({ hoardingId: hoarding._id }).select('_id');
  if (allBookings.length > 0) {
    const bookingIds = allBookings.map(b => b._id);
    const initiatedPayment = await Payment.findOne({
      bookingId: { $in: bookingIds },
      paymentStatus: { $in: ['pending', 'paid', 'verified'] }
    });
    if (initiatedPayment) {
      return { requiresApproval: true, lockReason: `payment initiated (${initiatedPayment.paymentStatus})` };
    }
  }

  // Hoarding is free and available
  return { requiresApproval: false, lockReason: '' };
}

exports.updateHoarding = async (req, res, next) => {
  try {
    let hoarding = await Hoarding.findById(req.params.id);
    if (!hoarding) return res.status(404).json({ success: false, message: 'Hoarding site not found.' });

    if (hoarding.sellerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    const updates = { ...req.body };

    if (updates.pricing) {
      const existingPricing = hoarding.pricing?.toObject?.() || hoarding.pricing || {};
      updates.pricing = {
        ...existingPricing,
        ...updates.pricing
      };
      if (updates.pricing.baseRatePerMonth && !updates.pricing.baseRatePerDay) {
        updates.pricing.baseRatePerDay = Math.round(Number(updates.pricing.baseRatePerMonth) / 30);
      }
    }

    if (updates.dimensions) {
      const existingDimensions = hoarding.dimensions?.toObject?.() || hoarding.dimensions || {};
      updates.dimensions = {
        ...existingDimensions,
        ...updates.dimensions
      };
    }

    if (updates.location || updates.googleMapsUrl) {
      const existingLocation = hoarding.location?.toObject?.() || hoarding.location || {};
      updates.location = {
        ...existingLocation,
        ...(updates.location || {})
      };
      if (updates.googleMapsUrl) {
        updates.location.googleMapsUrl = updates.googleMapsUrl;
      }
    }

    if (updates.location?.geo?.coordinates) {
      updates.location.geo = {
        type: 'Point',
        coordinates: [
          parseFloat(updates.location.geo.coordinates[0]),
          parseFloat(updates.location.geo.coordinates[1])
        ]
      };
    }

    // CHECK ADMIN APPROVAL REQUIREMENT:
    // If not admin, check if hoarding is under booking, 3-day mounting, payment initiated, or booked
    if (req.user.role !== 'admin') {
      const { requiresApproval, lockReason } = await checkHoardingRequiresApproval(hoarding);

      if (requiresApproval) {
        // Save as pending modification request for Super Admin approval
        hoarding.modificationRequest = {
          status: 'pending',
          requestedUpdates: updates,
          reason: req.body.reason || `Price / Specs update requested while hoarding is ${lockReason}.`,
          lockReason,
          requestedBy: req.user.id,
          requestedAt: new Date(),
          adminNotes: ''
        };
        await hoarding.save();

        return res.status(200).json({
          success: true,
          requiresApproval: true,
          message: `This billboard is currently ${lockReason}. Your requested price and specification changes have been submitted to Super Admin for approval.`,
          hoarding
        });
      }
    }

    // Direct update: hoarding is available with no active contracts/payments
    hoarding = await Hoarding.findByIdAndUpdate(
      req.params.id,
      {
        ...updates,
        'modificationRequest.status': 'none'
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      requiresApproval: false,
      message: 'Hoarding updated successfully.',
      hoarding
    });
  } catch (error) {
    next(error);
  }
};

exports.updateHoardingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['available', 'occupied', 'under_maintenance', 'inactive'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const hoarding = await Hoarding.findById(req.params.id);
    if (!hoarding) return res.status(404).json({ success: false, message: 'Hoarding site not found.' });

    if (hoarding.sellerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    // If seller attempts to change status while under active booking / mounting / payment
    if (req.user.role !== 'admin') {
      const { requiresApproval, lockReason } = await checkHoardingRequiresApproval(hoarding);

      if (requiresApproval && status === 'available') {
        hoarding.modificationRequest = {
          status: 'pending',
          requestedUpdates: { availabilityStatus: status },
          reason: `Status release to AVAILABLE requested while hoarding is ${lockReason}.`,
          lockReason,
          requestedBy: req.user.id,
          requestedAt: new Date(),
          adminNotes: ''
        };
        await hoarding.save();

        return res.status(200).json({
          success: true,
          requiresApproval: true,
          message: `This billboard is currently ${lockReason}. Releasing status to available requires Super Admin approval.`,
          hoarding
        });
      }
    }

    hoarding.availabilityStatus = status;
    await hoarding.save();

    res.status(200).json({
      success: true,
      requiresApproval: false,
      message: `Hoarding status updated to ${status}.`,
      hoarding
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteHoarding = async (req, res, next) => {
  try {
    const hoarding = await Hoarding.findById(req.params.id);
    if (!hoarding) return res.status(404).json({ success: false, message: 'Hoarding not found.' });

    if (hoarding.sellerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    await Hoarding.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Hoarding removed.' });
  } catch (error) {
    next(error);
  }
};

exports.getMyHoardings = async (req, res, next) => {
  try {
    const hoardings = await Hoarding.find({ sellerId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: hoardings.length, hoardings });
  } catch (error) {
    next(error);
  }
};

exports.getWBLocations = async (req, res, next) => {
  try {
    const { WB_REGIONS } = require('../../utils/geo');
    res.status(200).json({ success: true, regions: WB_REGIONS });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete a non-cover photo from hoarding gallery and Cloudinary
 *          (Cover photo at index 0 is protected and requires admin request)
 * @route   DELETE /api/hoardings/:id/photos
 * @access  Private (Seller/Admin)
 */
exports.deleteHoardingPhoto = async (req, res, next) => {
  try {
    const { photoUrl } = req.body;
    if (!photoUrl) {
      return res.status(400).json({ success: false, message: 'Photo URL is required.' });
    }

    const hoarding = await Hoarding.findById(req.params.id);
    if (!hoarding) {
      return res.status(404).json({ success: false, message: 'Hoarding site not found.' });
    }

    // Authorization: owner seller or admin
    if (hoarding.sellerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to modify this hoarding.' });
    }

    const photoIndex = hoarding.photos.indexOf(photoUrl);
    if (photoIndex === -1) {
      return res.status(404).json({ success: false, message: 'Photo not found in this hoarding gallery.' });
    }

    // RULE: Cover photo (index 0) cannot be deleted directly by seller
    if (photoIndex === 0 && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        isCoverPhoto: true,
        message: 'The primary Cover Photo cannot be deleted directly. Please click "Request Cover Pic Delete" for Super Admin approval.'
      });
    }

    // Delete photo from Cloudinary
    await deleteFromCloudinary(photoUrl);

    // Remove photo from array
    hoarding.photos.splice(photoIndex, 1);
    await hoarding.save();

    res.status(200).json({
      success: true,
      message: 'Photo deleted from Cloudinary and removed from hoarding gallery.',
      photos: hoarding.photos
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Request deletion of the primary cover photo (requires admin approval)
 * @route   POST /api/hoardings/:id/request-cover-delete
 * @access  Private (Seller/Admin)
 */
exports.requestCoverPhotoDelete = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const hoarding = await Hoarding.findById(req.params.id);
    if (!hoarding) {
      return res.status(404).json({ success: false, message: 'Hoarding site not found.' });
    }

    if (hoarding.sellerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    if (!hoarding.photos || hoarding.photos.length === 0) {
      return res.status(400).json({ success: false, message: 'Hoarding has no photos to delete.' });
    }

    const coverPhoto = hoarding.photos[0];

    // Check if request is already pending
    if (hoarding.coverPhotoDeletionRequest?.status === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'A deletion request for this cover photo is already pending Super Admin review.'
      });
    }

    hoarding.coverPhotoDeletionRequest = {
      status: 'pending',
      photoUrl: coverPhoto,
      reason: reason || 'Media owner requested removal of cover picture.',
      requestedAt: new Date()
    };

    await hoarding.save();

    res.status(200).json({
      success: true,
      message: 'Cover photo deletion request submitted to Super Admin. You will be notified once reviewed.',
      coverPhotoDeletionRequest: hoarding.coverPhotoDeletionRequest
    });
  } catch (error) {
    next(error);
  }
};
