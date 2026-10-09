const Hoarding = require('../../models/Hoarding');
const Booking = require('../../models/Booking');
const { resolveWBCoordinates, calculateDistanceKm, WB_CITIES } = require('../../utils/geo');

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

    hoarding = await Hoarding.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    res.status(200).json({ success: true, message: 'Hoarding updated successfully.', hoarding });
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

    hoarding.availabilityStatus = status;
    await hoarding.save();

    res.status(200).json({
      success: true,
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
