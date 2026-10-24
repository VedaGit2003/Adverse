const Booking = require('../../models/Booking');
const Hoarding = require('../../models/Hoarding');
const Payment = require('../../models/Payment');
const { calculateDistanceKm } = require('../../utils/geo');
const { getPlatformSettings } = require('../settings/setting.controller');
const {
  isCloudinaryConfigured,
  uploadDataUriToCloudinary,
  uploadWatermarkedProofToCloudinary
} = require('../../utils/cloudinary');

// ============================================================================
// CONFIGURABLE DEFAULT TIMINGS & WINDOW DURATIONS
// Change these constants anytime to adjust the platform defaults:
// - DEFAULT_MOUNTING_WINDOW_DAYS: e.g. 3 for 3-day mounting window
// - DEFAULT_VERIFICATION_WINDOW_HOURS: e.g. 4 for 4-hour customer verification window
// ============================================================================
const DEFAULT_MOUNTING_WINDOW_DAYS = 3;       // 3 days (72 hours) mounting window
const DEFAULT_VERIFICATION_WINDOW_HOURS = 4;   // 4 hours customer verification window

function generateBookingNumber() {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const timestamp = Date.now().toString().slice(-4);
  return `BK-WB-${timestamp}-${randomSuffix}`;
}

// Helper: Check and auto-verify expired verification windows
async function checkAndAutoVerifyBooking(booking) {
  if (!booking) return booking;

  if (
    booking.bookingStatus === 'verification_pending' &&
    booking.mountingDetails &&
    booking.mountingDetails.verificationWindowExpiresAt &&
    new Date() >= new Date(booking.mountingDetails.verificationWindowExpiresAt)
  ) {
    booking.bookingStatus = 'active';
    booking.mountingDetails.confirmationStatus = 'verified';

    const startDate = new Date(booking.mountingDetails.verificationWindowExpiresAt);
    booking.subscriptionStartDate = startDate;
    booking.subscriptionEndDate = new Date(
      startDate.getTime() + (booking.durationDays || 30) * 24 * 60 * 60 * 1000
    );

    booking.timeline.push({
      event: 'auto_verified',
      title: 'Auto-Verified After 4-Hour Window',
      description: 'Customer 4-hour verification window elapsed. Subscription officially initiated.',
      performedByRole: 'system',
      timestamp: new Date()
    });

    await booking.save();
    await syncHoardingAvailability(booking.hoardingId);
  }
  return booking;
}

// Helper: Synchronize hoarding availabilityStatus based on active bookings
async function syncHoardingAvailability(hoardingId) {
  if (!hoardingId) return;
  try {
    const activeBooking = await Booking.findOne({
      hoardingId,
      bookingStatus: { $in: ['active', 'confirmed', 'mounting_window', 'verification_pending'] }
    });
    const targetStatus = activeBooking ? 'occupied' : 'available';
    await Hoarding.findByIdAndUpdate(hoardingId, { availabilityStatus: targetStatus });
  } catch (err) {
    console.error('Failed to sync hoarding availability:', err);
  }
}

/**
 * @desc    Customer creates booking request (Step 1)
 * @route   POST /api/bookings
 * @access  Private (Customer)
 */
exports.createBooking = async (req, res, next) => {
  try {
    const {
      hoardingId,
      startDate,
      endDate,
      bookingType = 'online',
      campaignName,
      clientNotes,
      includePrinting = false,
      includeMounting = false
    } = req.body;

    if (!hoardingId || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Please provide hoardingId, startDate, and endDate.' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return res.status(400).json({ success: false, message: 'Invalid start or end dates.' });
    }

    const hoarding = await Hoarding.findById(hoardingId);
    if (!hoarding) {
      return res.status(404).json({ success: false, message: 'Hoarding site not found.' });
    }

    const diffTime = Math.abs(end - start);
    const durationDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (durationDays < (hoarding.pricing.minimumBookingDays || 1)) {
      return res.status(400).json({
        success: false,
        message: `Minimum booking duration is ${hoarding.pricing.minimumBookingDays} days.`
      });
    }

    // Check for conflicting active/mounting/confirmed bookings on same site
    const overlapping = await Booking.find({
      hoardingId: hoarding._id,
      bookingStatus: { $in: ['mounting_window', 'verification_pending', 'active', 'confirmed'] },
      $or: [{ startDate: { $lte: end }, endDate: { $gte: start } }]
    });

    if (overlapping.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This hoarding site is already reserved or active for the selected dates.'
      });
    }

    const dailyRate = hoarding.pricing.baseRatePerDay || Math.round(hoarding.pricing.baseRatePerMonth / 30);
    const rentAmount = dailyRate * durationDays;
    const printingAmount = includePrinting ? (hoarding.pricing.printingCostEstimate || 0) : 0;
    const mountingAmount = includeMounting ? (hoarding.pricing.mountingCostEstimate || 0) : 0;
    const totalAmount = rentAmount + printingAmount + mountingAmount;

    const bookingNumber = generateBookingNumber();

    const booking = await Booking.create({
      bookingNumber,
      hoardingId: hoarding._id,
      customerId: req.user.id,
      sellerId: hoarding.sellerId,
      startDate: start,
      endDate: end,
      durationDays,
      rentAmount,
      printingAmount,
      mountingAmount,
      totalAmount,
      bookingType,
      bookingStatus: 'requested', // Step 1: requested (Seller must approve before payment is available)
      paymentStatus: 'pending',
      campaignName: campaignName || 'Outdoor Hoarding Campaign',
      clientNotes: clientNotes || '',
      timeline: [
        {
          event: 'booking_requested',
          title: 'Booking Request Submitted',
          description: `Customer submitted booking request for ${durationDays} days. Awaiting seller approval.`,
          performedBy: req.user.id,
          performedByRole: req.user.role,
          timestamp: new Date()
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Booking request placed successfully. Site owner will review and approve.',
      booking
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user/seller bookings
 * @route   GET /api/bookings
 * @access  Private
 */
exports.getMyBookings = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === 'customer') filter.customerId = req.user.id;
    else if (req.user.role === 'seller') filter.sellerId = req.user.id;

    const bookings = await Booking.find(filter)
      .populate('hoardingId', 'title location dimensions lightingType photos pricing availabilityStatus')
      .populate('customerId', 'name email phone companyDetails')
      .populate('sellerId', 'name email phone companyDetails')
      .sort({ createdAt: -1 });

    // Auto-check expired verification windows
    const updatedBookings = await Promise.all(
      bookings.map(async (b) => {
        return await checkAndAutoVerifyBooking(b);
      })
    );

    res.status(200).json({ success: true, count: updatedBookings.length, bookings: updatedBookings });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get booking details by ID
 * @route   GET /api/bookings/:id
 * @access  Private
 */
exports.getBookingById = async (req, res, next) => {
  try {
    let booking = await Booking.findById(req.params.id)
      .populate('hoardingId')
      .populate('customerId', 'name email phone companyDetails')
      .populate('sellerId', 'name email phone companyDetails')
      .populate('mountingDetails.flexPickupUpdatedBy', 'name role')
      .populate('mountingDetails.mountingUpdatedBy', 'name role')
      .populate('mountingDetails.proofUploadedBy', 'name role');

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    booking = await checkAndAutoVerifyBooking(booking);

    const payments = await Payment.find({ bookingId: booking._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, booking, payments });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Seller or Admin Approves / Rejects Booking (Step 2)
 * @route   PUT /api/bookings/:id/seller-approval
 * @access  Private (Seller of this hoarding or Admin)
 */
exports.handleSellerApproval = async (req, res, next) => {
  try {
    const { action, notes } = req.body; // action: 'approve' | 'reject'
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    if (booking.sellerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized. Only the site owner or admin can approve.' });
    }

    if (action === 'approve') {
      booking.bookingStatus = 'approved'; // Unlocks payment option for customer!
      booking.sellerApproval = {
        status: 'approved',
        actionBy: req.user.id,
        actionAt: new Date(),
        notes: notes || 'Booking request approved. Customer may proceed with payment.'
      };
      booking.timeline.push({
        event: 'seller_approved',
        title: 'Booking Approved by Site Owner',
        description: notes || 'Booking approved. Payment option is now unlocked for customer.',
        performedBy: req.user.id,
        performedByRole: req.user.role,
        timestamp: new Date()
      });
    } else if (action === 'reject') {
      booking.bookingStatus = 'rejected';
      booking.sellerApproval = {
        status: 'rejected',
        actionBy: req.user.id,
        actionAt: new Date(),
        notes: notes || 'Booking request declined by site owner.'
      };
      booking.timeline.push({
        event: 'seller_rejected',
        title: 'Booking Rejected by Site Owner',
        description: notes || 'Booking request declined.',
        performedBy: req.user.id,
        performedByRole: req.user.role,
        timestamp: new Date()
      });
    } else {
      return res.status(400).json({ success: false, message: 'Invalid action. Use "approve" or "reject".' });
    }

    await booking.save();
    await syncHoardingAvailability(booking.hoardingId);

    res.status(200).json({
      success: true,
      message: `Booking has been ${action === 'approve' ? 'approved' : 'rejected'}.`,
      booking
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Customer completes payment (Step 3: starts 3-day mounting window & notifies seller & admin)
 * @route   POST /api/bookings/:id/pay
 * @access  Private (Customer of booking or Admin)
 */
exports.processBookingPayment = async (req, res, next) => {
  try {
    const {
      paymentMode = 'online_upi',
      transactionReference,
      receiptImageUrl,
      bankName
    } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    if (booking.customerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    if (booking.bookingStatus !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Payment cannot be made until the site owner approves the booking request.'
      });
    }

    // Record Payment
    const payment = await Payment.create({
      bookingId: booking._id,
      customerId: booking.customerId,
      sellerId: booking.sellerId,
      amount: booking.totalAmount,
      paymentMode,
      paymentStatus: 'paid',
      offlineDetails: {
        transactionReference: transactionReference || `TXN-${Date.now()}`,
        bankName: bankName || 'Online Payment Gateway',
        receiptImageUrl: receiptImageUrl || '',
        paymentDate: new Date(),
        verifiedBy: req.user.id,
        verifiedAt: new Date(),
        verificationNotes: 'Customer payment recorded successfully'
      }
    });

    // Update Booking status to mounting_window & initiate mounting window
    const now = new Date();
    const windowEnds = new Date(now.getTime() + DEFAULT_MOUNTING_WINDOW_DAYS * 24 * 60 * 60 * 1000); // Configurable mounting window (default 3 days / 72 hours)

    booking.paymentStatus = 'paid';
    booking.bookingStatus = 'mounting_window';
    booking.paymentConfirmation = {
      paidAt: now,
      paymentMode,
      transactionReference: transactionReference || payment._id.toString(),
      receiptImageUrl: receiptImageUrl || '',
      bankName: bankName || '',
      confirmedToSeller: true,
      confirmedToAdmin: true,
      confirmedAt: now
    };

    booking.mountingDetails = {
      windowStartedAt: now,
      windowEndsAt: windowEnds,
      flexPickupStatus: 'pending',
      mountingStatus: 'pending',
      confirmationStatus: 'pending'
    };

    booking.timeline.push({
      event: 'payment_completed',
      title: 'Payment Completed & Confirmation Dispatched',
      description: `Payment of ₹${booking.totalAmount.toLocaleString('en-IN')} confirmed. Dispatched to Seller & Admin. 3-Day Mounting Window initiated (ends: ${windowEnds.toLocaleString('en-IN')}).`,
      performedBy: req.user.id,
      performedByRole: req.user.role,
      timestamp: now
    });

    await booking.save();
    await syncHoardingAvailability(booking.hoardingId);

    res.status(200).json({
      success: true,
      message: 'Payment recorded! Confirmation sent to seller and admin. 3-day mounting window has begun.',
      booking,
      payment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Seller / Admin updates mounting phase (Phase 1: Flex Pick up or Phase 2: Mounting)
 * @route   PUT /api/bookings/:id/mounting-phase
 * @access  Private (Seller or Admin)
 */
exports.updateMountingPhase = async (req, res, next) => {
  try {
    const { phase, status, notes } = req.body;
    // phase: 'flex_pickup' | 'mounting'
    // status: 'pending' | 'in_progress' | 'completed'

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    if (booking.sellerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized. Site owner or admin only.' });
    }

    if (!['flex_pickup', 'mounting'].includes(phase)) {
      return res.status(400).json({ success: false, message: 'Invalid phase. Must be flex_pickup or mounting.' });
    }

    if (!['pending', 'in_progress', 'completed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    if (!booking.mountingDetails) {
      booking.mountingDetails = {};
    }

    if (phase === 'flex_pickup') {
      booking.mountingDetails.flexPickupStatus = status;
      booking.mountingDetails.flexPickupNotes = notes || '';
      booking.mountingDetails.flexPickupUpdatedBy = req.user.id;
      if (status === 'completed') {
        booking.mountingDetails.flexPickupCompletedAt = new Date();
      }
      booking.timeline.push({
        event: 'phase1_flex_pickup_update',
        title: `Phase 1 (Flex Pick up): ${status.toUpperCase()}`,
        description: notes || `Flex pick up status updated to ${status}.`,
        performedBy: req.user.id,
        performedByRole: req.user.role,
        timestamp: new Date()
      });
    } else if (phase === 'mounting') {
      booking.mountingDetails.mountingStatus = status;
      booking.mountingDetails.mountingNotes = notes || '';
      booking.mountingDetails.mountingUpdatedBy = req.user.id;
      if (status === 'completed') {
        booking.mountingDetails.mountingCompletedAt = new Date();
      }
      booking.timeline.push({
        event: 'phase2_mounting_update',
        title: `Phase 2 (Mounting): ${status.toUpperCase()}`,
        description: notes || `Mounting status updated to ${status}.`,
        performedBy: req.user.id,
        performedByRole: req.user.role,
        timestamp: new Date()
      });
    }

    await booking.save();
    res.status(200).json({ success: true, message: `Phase ${phase} updated to ${status}.`, booking });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Seller / Admin uploads Phase 3 Confirmation Proof Photo with Date and Time
 * @route   POST /api/bookings/:id/mounting-proof
 * @access  Private (Seller or Admin)
 */
exports.uploadMountingProof = async (req, res, next) => {
  try {
    const {
      proofPhotoUrl,
      proofCaptureDateTime,
      notes,
      latitude,
      longitude,
      accuracy,
      deviceAddress,
      source
    } = req.body;

    if (!proofPhotoUrl) {
      return res.status(400).json({ success: false, message: 'Please provide proofPhotoUrl.' });
    }

    const booking = await Booking.findById(req.params.id).populate('hoardingId');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    if (booking.sellerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized. Site owner or admin only.' });
    }

    const now = new Date();
    const verificationExpires = new Date(now.getTime() + DEFAULT_VERIFICATION_WINDOW_HOURS * 60 * 60 * 1000);

    // Calculate GPS Geofence & Proximity to Hoarding
    const hoarding = booking.hoardingId;
    let hoardingLng = null;
    let hoardingLat = null;
    if (hoarding?.location?.geo?.coordinates?.length >= 2) {
      hoardingLng = hoarding.location.geo.coordinates[0];
      hoardingLat = hoarding.location.geo.coordinates[1];
    } else if (hoarding?.location?.coordinates?.length >= 2) {
      hoardingLng = hoarding.location.coordinates[0];
      hoardingLat = hoarding.location.coordinates[1];
    }

    // Fetch Admin Platform Settings (Feature Toggle)
    const platformConfig = await getPlatformSettings();
    const isGpsActive = platformConfig?.gpsVerificationEnabled !== false;
    const allowedRadiusMeters = platformConfig?.geofenceRadiusMeters || 500;
    const isWatermarkActive = platformConfig?.watermarkEnabled !== false;

    let distanceMeters = null;
    let isWithinGeofence = null;
    let verifiedOnSite = false;

    const hasCoords = latitude !== undefined && latitude !== null && longitude !== undefined && longitude !== null;

    if (isGpsActive && hasCoords && hoardingLat !== null && hoardingLng !== null) {
      const distKm = calculateDistanceKm(Number(latitude), Number(longitude), hoardingLat, hoardingLng);
      distanceMeters = Math.round(distKm * 1000);
      isWithinGeofence = distanceMeters <= allowedRadiusMeters;
      verifiedOnSite = isWithinGeofence;
    } else if (!isGpsActive) {
      // Feature toggled OFF by Admin: bypass proximity enforcement
      isWithinGeofence = true;
      verifiedOnSite = false;
    }

    let finalPhotoUrl = proofPhotoUrl;
    if (proofPhotoUrl && isCloudinaryConfigured) {
      try {
        if (isGpsActive && isWatermarkActive) {
          const cloudRes = await uploadWatermarkedProofToCloudinary(proofPhotoUrl, {
            folder: 'adverse/mounting_proofs',
            hoardingCode: hoarding?.hoardingCode || hoarding?.title || 'HOARDING',
            latitude: hasCoords ? Number(latitude) : null,
            longitude: hasCoords ? Number(longitude) : null,
            distanceMeters,
            isWithinGeofence,
            timestamp: now
          });
          finalPhotoUrl = cloudRes.secure_url;
        } else {
          const cloudRes = await uploadDataUriToCloudinary(proofPhotoUrl, { folder: 'adverse/mounting_proofs' });
          finalPhotoUrl = cloudRes.secure_url;
        }
      } catch (cloudErr) {
        console.error('[MountingProof] Failed to upload proof to Cloudinary:', cloudErr.message);
        if (proofPhotoUrl.startsWith('data:image/')) {
          try {
            const fallbackRes = await uploadDataUriToCloudinary(proofPhotoUrl, { folder: 'adverse/mounting_proofs' });
            finalPhotoUrl = fallbackRes.secure_url;
          } catch (e) {
            console.error('[MountingProof] Fallback upload also failed:', e.message);
          }
        }
      }
    }

    if (!booking.mountingDetails) booking.mountingDetails = {};

    const formattedStamp = proofCaptureDateTime || now.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    booking.mountingDetails.mountingStatus = 'completed';
    booking.mountingDetails.confirmationStatus = 'proof_uploaded';
    booking.mountingDetails.proofPhotoUrl = finalPhotoUrl;
    booking.mountingDetails.proofCaptureDateTime = formattedStamp;
    booking.mountingDetails.proofUploadedAt = now;
    booking.mountingDetails.proofNotes = notes || '';
    booking.mountingDetails.proofUploadedBy = req.user.id;

    // Save GPS Geolocation Audit Trail
    booking.mountingDetails.proofGeoLocation = {
      latitude: hasCoords ? Number(latitude) : null,
      longitude: hasCoords ? Number(longitude) : null,
      accuracy: accuracy !== undefined && accuracy !== null ? Number(accuracy) : null,
      distanceMetersFromHoarding: distanceMeters,
      isWithinGeofence,
      verifiedOnSite,
      deviceAddress: deviceAddress || '',
      source: source || (hasCoords ? 'mobile_gps' : 'manual'),
      capturedAt: proofCaptureDateTime ? new Date(proofCaptureDateTime) : now
    };

    // Start Customer/Admin Verification Window
    booking.mountingDetails.verificationWindowStartedAt = now;
    booking.mountingDetails.verificationWindowExpiresAt = verificationExpires;
    booking.bookingStatus = 'verification_pending';

    let timelineDesc = `Hoarding photo with date & time (${formattedStamp}) uploaded.`;
    if (verifiedOnSite) {
      timelineDesc += ` 🟢 GPS Verified On-Site (${distanceMeters}m from billboard).`;
    } else if (isWithinGeofence === false) {
      timelineDesc += ` ⚠️ Geofence Alert: Captured ${distanceMeters}m away from registered coordinates.`;
    }
    timelineDesc += ` Customer and Admin have ${DEFAULT_VERIFICATION_WINDOW_HOURS} hours to verify before campaign activates.`;

    booking.timeline.push({
      event: 'phase3_proof_uploaded',
      title: 'Phase 3 (Confirmation): Proof Photo Uploaded',
      description: timelineDesc,
      performedBy: req.user.id,
      performedByRole: req.user.role,
      timestamp: now
    });

    await booking.save();

    res.status(200).json({
      success: true,
      message: verifiedOnSite
        ? `Mounting proof verified on-site (${distanceMeters}m) and uploaded! 4-hour verification window has started.`
        : 'Mounting proof uploaded! 4-hour verification window has started.',
      distanceMeters,
      isWithinGeofence,
      verifiedOnSite,
      booking
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Customer or Admin verifies mounting proof (Activates Campaign & Subscription Date starts)
 * @route   PUT /api/bookings/:id/verify-mounting
 * @access  Private (Customer or Admin)
 */
exports.verifyMountingProof = async (req, res, next) => {
  try {
    const { verified = true, notes } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    if (booking.customerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized. Only customer or admin can verify.' });
    }

    const now = new Date();

    if (verified) {
      if (req.user.role === 'customer') {
        booking.mountingDetails.customerVerified = true;
        booking.mountingDetails.customerVerifiedAt = now;
        booking.mountingDetails.customerNotes = notes || 'Installation verified and approved by customer.';
      } else {
        booking.mountingDetails.adminVerified = true;
        booking.mountingDetails.adminVerifiedAt = now;
        booking.mountingDetails.adminNotes = notes || 'Verified and approved by Super Admin.';
      }

      booking.mountingDetails.confirmationStatus = 'verified';
      booking.bookingStatus = 'active';

      // Officially start subscription term!
      booking.subscriptionStartDate = now;
      booking.subscriptionEndDate = new Date(
        now.getTime() + (booking.durationDays || 30) * 24 * 60 * 60 * 1000
      );

      // Also set Hoarding availability to occupied
      await Hoarding.findByIdAndUpdate(booking.hoardingId, { availabilityStatus: 'occupied' });

      booking.timeline.push({
        event: 'mounting_verified',
        title: `Mounting Verified by ${req.user.role === 'admin' ? 'Admin' : 'Customer'}`,
        description: `Installation confirmed. Subscription date officially starts on ${now.toLocaleDateString('en-IN')}, active until ${booking.subscriptionEndDate.toLocaleDateString('en-IN')}.`,
        performedBy: req.user.id,
        performedByRole: req.user.role,
        timestamp: now
      });
    } else {
      booking.mountingDetails.confirmationStatus = 'rejected';
      booking.mountingDetails.customerNotes = notes || 'Customer rejected installation quality.';

      booking.timeline.push({
        event: 'mounting_rejected',
        title: 'Mounting Proof Issue Reported',
        description: notes || 'Customer reported an issue with the mounting installation.',
        performedBy: req.user.id,
        performedByRole: req.user.role,
        timestamp: now
      });
    }

    await booking.save();

    res.status(200).json({
      success: true,
      message: verified
        ? 'Mounting verified! Campaign subscription has officially started.'
        : 'Feedback recorded. Seller notified to remediate.',
      booking
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Super Admin has full rights to edit/override any status or phase at any point
 * @route   PUT /api/bookings/:id/admin-override
 * @access  Private (Admin only)
 */
exports.adminOverrideBooking = async (req, res, next) => {
  try {
    const {
      bookingStatus,
      paymentStatus,
      flexPickupStatus,
      mountingStatus,
      confirmationStatus,
      proofPhotoUrl,
      proofCaptureDateTime,
      subscriptionStartDate,
      subscriptionEndDate,
      mountingWindowDays,
      windowEndsAt,
      verificationWindowHours,
      verificationWindowExpiresAt,
      adminNotes
    } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    if (!booking.mountingDetails) booking.mountingDetails = {};

    if (bookingStatus) {
      booking.bookingStatus = bookingStatus;

      // Keep sellerApproval in sync with overall booking status
      if (!booking.sellerApproval) booking.sellerApproval = {};
      if (['approved', 'mounting_window', 'verification_pending', 'active', 'completed'].includes(bookingStatus)) {
        booking.sellerApproval.status = 'approved';
        if (!booking.sellerApproval.actionAt) {
          booking.sellerApproval.actionAt = new Date();
          booking.sellerApproval.actionBy = req.user.id;
          booking.sellerApproval.notes = adminNotes || 'Approved via Admin Governance Override';
        }
      } else if (['rejected', 'cancelled'].includes(bookingStatus)) {
        booking.sellerApproval.status = 'rejected';
        booking.sellerApproval.actionAt = new Date();
        booking.sellerApproval.actionBy = req.user.id;
        booking.sellerApproval.notes = adminNotes || 'Declined via Admin Governance Override';
      }
    }
    if (paymentStatus) booking.paymentStatus = paymentStatus;

    if (flexPickupStatus) {
      booking.mountingDetails.flexPickupStatus = flexPickupStatus;
      if (flexPickupStatus === 'completed' && !booking.mountingDetails.flexPickupCompletedAt) {
        booking.mountingDetails.flexPickupCompletedAt = new Date();
      }
    }

    if (mountingStatus) {
      booking.mountingDetails.mountingStatus = mountingStatus;
      if (mountingStatus === 'completed' && !booking.mountingDetails.mountingCompletedAt) {
        booking.mountingDetails.mountingCompletedAt = new Date();
      }
    }

    if (confirmationStatus) booking.mountingDetails.confirmationStatus = confirmationStatus;
    if (proofPhotoUrl !== undefined) booking.mountingDetails.proofPhotoUrl = proofPhotoUrl;
    if (proofCaptureDateTime !== undefined) booking.mountingDetails.proofCaptureDateTime = proofCaptureDateTime;

    if (subscriptionStartDate) booking.subscriptionStartDate = new Date(subscriptionStartDate);
    if (subscriptionEndDate) booking.subscriptionEndDate = new Date(subscriptionEndDate);

    // Admin custom adjustment for 3-Day Mounting Window
    if (windowEndsAt) {
      booking.mountingDetails.windowEndsAt = new Date(windowEndsAt);
    } else if (mountingWindowDays !== undefined && mountingWindowDays !== null && mountingWindowDays !== '') {
      const days = parseFloat(mountingWindowDays);
      if (!isNaN(days) && days > 0) {
        const base = booking.mountingDetails.windowStartedAt ? new Date(booking.mountingDetails.windowStartedAt) : new Date();
        booking.mountingDetails.windowEndsAt = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
      }
    }

    // Admin custom adjustment for Customer Verification Window (4 Hours)
    if (verificationWindowExpiresAt) {
      booking.mountingDetails.verificationWindowExpiresAt = new Date(verificationWindowExpiresAt);
    } else if (verificationWindowHours !== undefined && verificationWindowHours !== null && verificationWindowHours !== '') {
      const hours = parseFloat(verificationWindowHours);
      if (!isNaN(hours) && hours > 0) {
        const base = booking.mountingDetails.verificationWindowStartedAt ? new Date(booking.mountingDetails.verificationWindowStartedAt) : new Date();
        booking.mountingDetails.verificationWindowExpiresAt = new Date(base.getTime() + hours * 60 * 60 * 1000);
      }
    }

    booking.mountingDetails.adminVerified = true;
    booking.mountingDetails.adminVerifiedAt = new Date();
    if (adminNotes) booking.mountingDetails.adminNotes = adminNotes;

    booking.markModified('mountingDetails');

    booking.timeline.push({
      event: 'admin_override',
      title: 'Admin Override Applied',
      description: adminNotes || `Super Admin updated status to '${booking.bookingStatus}' and adjusted mounting window timings.`,
      performedBy: req.user.id,
      performedByRole: 'admin',
      timestamp: new Date()
    });

    await booking.save();
    await syncHoardingAvailability(booking.hoardingId);

    res.status(200).json({
      success: true,
      message: 'Admin override applied successfully.',
      booking
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update booking general status (legacy/compat)
 * @route   PUT /api/bookings/:id/status
 * @access  Private (Seller, Admin)
 */
exports.updateBookingStatus = async (req, res, next) => {
  try {
    const { bookingStatus } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    booking.bookingStatus = bookingStatus;
    if (!booking.sellerApproval) booking.sellerApproval = {};
    if (['approved', 'mounting_window', 'verification_pending', 'active', 'completed'].includes(bookingStatus)) {
      booking.sellerApproval.status = 'approved';
    } else if (['rejected', 'cancelled'].includes(bookingStatus)) {
      booking.sellerApproval.status = 'rejected';
    }

    await booking.save();
    await syncHoardingAvailability(booking.hoardingId);

    res.status(200).json({ success: true, message: 'Booking status updated.', booking });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update campaign creative
 * @route   PUT /api/bookings/:id/creative
 * @access  Private
 */
exports.updateCampaignCreative = async (req, res, next) => {
  try {
    const { creativeUrl, campaignName } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    if (creativeUrl) booking.creativeUrl = creativeUrl;
    if (campaignName) booking.campaignName = campaignName;
    await booking.save();
    res.status(200).json({ success: true, message: 'Artwork updated.', booking });
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// FLEX REMOUNTING PIPELINE (₹3 PER SQ.FT CHARGE & MULTI-PHASE FLOW)
// ============================================================================
const REMOUNTING_RATE_PER_SQFT = 3; // Fixed platform rate: 3 Rs per square foot

function generateRemountingRequestId() {
  const timestamp = Date.now().toString().slice(-4);
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `REM-WB-${timestamp}-${randomSuffix}`;
}

/**
 * @desc    Client or Admin creates a new Flex Remounting request for an ongoing booking
 * @route   POST /api/bookings/:id/remounting
 * @access  Private (Customer of booking or Admin)
 */
exports.requestRemounting = async (req, res, next) => {
  try {
    const { campaignName, newCreativeUrl, notes, pickupAddress, customWidth, customHeight } = req.body;

    const booking = await Booking.findById(req.params.id).populate('hoardingId');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    // Customer or Admin only
    if (booking.customerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized. Only the booking customer or admin can request remounting.' });
    }

    // Must be an ongoing / active booking (or confirmed/mounting)
    if (!['active', 'confirmed', 'mounting_window', 'verification_pending'].includes(booking.bookingStatus) && req.user.role !== 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Remounting can only be requested for ongoing or active bookings.'
      });
    }

    const hoarding = booking.hoardingId;
    const width = Number(customWidth) || Number(hoarding?.dimensions?.width) || 20;
    const height = Number(customHeight) || Number(hoarding?.dimensions?.height) || 10;
    const unit = hoarding?.dimensions?.unit || 'feet';

    const areaSqFt = Math.round(width * height);
    if (areaSqFt <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid hoarding dimensions to calculate square footage.' });
    }

    // Exact ₹3 per square foot
    const totalAmount = areaSqFt * REMOUNTING_RATE_PER_SQFT;
    const requestId = generateRemountingRequestId();

    const newRequest = {
      requestId,
      requestedAt: new Date(),
      requestedBy: req.user.id,
      dimensions: { width, height, unit },
      areaSqFt,
      ratePerSqFt: REMOUNTING_RATE_PER_SQFT,
      totalAmount,
      campaignName: campaignName || booking.campaignName || 'Flex Banner Remounting',
      newCreativeUrl: newCreativeUrl || '',
      notes: notes || '',
      pickupAddress: pickupAddress || '',
      status: 'requested', // Step 1: Requested
      paymentStatus: 'pending',
      history: [
        {
          status: 'requested',
          title: 'Remounting Requested',
          description: `Customer requested new flex remounting (${width}ft × ${height}ft = ${areaSqFt} sq.ft @ ₹${REMOUNTING_RATE_PER_SQFT}/sq.ft = ₹${totalAmount}).`,
          updatedAt: new Date(),
          updatedBy: req.user.id,
          updatedByRole: req.user.role
        }
      ]
    };

    if (!booking.remountingRequests) {
      booking.remountingRequests = [];
    }

    booking.remountingRequests.unshift(newRequest);

    booking.timeline.push({
      event: 'flex_remounting_requested',
      title: 'New Flex Remounting Requested',
      description: `Request ${requestId}: ${areaSqFt} sq.ft @ ₹${REMOUNTING_RATE_PER_SQFT}/sq.ft. Total fee: ₹${totalAmount.toLocaleString('en-IN')}.`,
      performedBy: req.user.id,
      performedByRole: req.user.role,
      timestamp: new Date()
    });

    await booking.save();

    res.status(201).json({
      success: true,
      message: `Flex remounting requested successfully. Total charge: ₹${totalAmount} (${areaSqFt} sq.ft @ ₹3/sq.ft).`,
      remountingRequest: newRequest,
      booking
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Process payment for flex remounting (₹3 per sq.ft)
 * @route   POST /api/bookings/:id/remounting/:requestId/pay
 * @access  Private (Customer or Admin)
 */
exports.payRemounting = async (req, res, next) => {
  try {
    const { paymentMode = 'online_upi', transactionReference, receiptImageUrl, bankName } = req.body;
    const { id, requestId } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    if (booking.customerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const remounting = (booking.remountingRequests || []).find((r) => r.requestId === requestId);
    if (!remounting) {
      return res.status(404).json({ success: false, message: 'Remounting request not found.' });
    }

    if (remounting.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Remounting fee is already paid.' });
    }

    const now = new Date();
    const txnRef = transactionReference || `REM-TXN-${Date.now()}`;

    // Record in Payment collection
    const payment = await Payment.create({
      bookingId: booking._id,
      customerId: booking.customerId,
      sellerId: booking.sellerId,
      amount: remounting.totalAmount,
      paymentMode,
      paymentStatus: 'paid',
      offlineDetails: {
        transactionReference: txnRef,
        bankName: bankName || 'Online Payment Gateway',
        receiptImageUrl: receiptImageUrl || '',
        paymentDate: now,
        verifiedBy: req.user.id,
        verifiedAt: now,
        verificationNotes: `Payment of ₹${remounting.totalAmount} for Flex Remounting (${remounting.areaSqFt} sq.ft @ ₹3/sq.ft)`
      }
    });

    remounting.paymentStatus = 'paid';
    remounting.status = 'paid'; // Advance moving line to Paid
    remounting.paymentDetails = {
      paidAt: now,
      paymentMode,
      transactionReference: txnRef,
      receiptImageUrl: receiptImageUrl || '',
      confirmedAt: now
    };

    remounting.history.push({
      status: 'paid',
      title: 'Remounting Fee Paid',
      description: `Payment of ₹${remounting.totalAmount.toLocaleString('en-IN')} confirmed via ${paymentMode}. Ready for flex pickup & mounting.`,
      updatedAt: now,
      updatedBy: req.user.id,
      updatedByRole: req.user.role
    });

    booking.timeline.push({
      event: 'flex_remounting_paid',
      title: 'Flex Remounting Fee Paid',
      description: `Remounting fee of ₹${remounting.totalAmount.toLocaleString('en-IN')} paid (${remounting.areaSqFt} sq.ft @ ₹3/sq.ft). Txn: ${txnRef}.`,
      performedBy: req.user.id,
      performedByRole: req.user.role,
      timestamp: now
    });

    booking.markModified('remountingRequests');
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Remounting payment processed successfully! Ready for pickup & mounting.',
      remountingRequest: remounting,
      payment,
      booking
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update remounting status (Admin has full rights to set ANY status; Seller can update operational phases)
 * @route   PUT /api/bookings/:id/remounting/:requestId/status
 * @access  Private (Seller or Admin)
 */
exports.updateRemountingStatus = async (req, res, next) => {
  try {
    const { id, requestId } = req.params;
    const { status, notes, adminNotes, newCreativeUrl, flexPickupNotes, mountingNotes } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    const isSeller = booking.sellerId.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isSeller && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized. Site owner or admin only.' });
    }

    const remounting = (booking.remountingRequests || []).find((r) => r.requestId === requestId);
    if (!remounting) {
      return res.status(404).json({ success: false, message: 'Remounting request not found.' });
    }

    const validStatuses = [
      'requested',
      'approved',
      'paid',
      'flex_pickup',
      'mounting',
      'proof_uploaded',
      'completed',
      'rejected',
      'cancelled'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    // Seller permissions check: Admin can set ANY status, Seller can update workflow phases
    if (!isAdmin && ['rejected', 'cancelled', 'completed'].includes(status)) {
      return res.status(403).json({ success: false, message: 'Only an admin can finalize or reject/cancel remounting requests.' });
    }

    const now = new Date();
    remounting.status = status;

    if (adminNotes && isAdmin) {
      remounting.adminNotes = adminNotes;
    }
    if (notes) {
      remounting.notes = notes;
    }
    if (newCreativeUrl) {
      remounting.newCreativeUrl = newCreativeUrl;
    }

    if (status === 'flex_pickup') {
      remounting.flexPickupCompletedAt = now;
      if (flexPickupNotes) remounting.notes = flexPickupNotes;
    } else if (status === 'mounting') {
      remounting.mountingCompletedAt = now;
      if (mountingNotes) remounting.notes = mountingNotes;
    } else if (status === 'completed') {
      remounting.verifiedAt = now;
      remounting.verifiedBy = req.user.id;
      // If a new creative URL was specified, also update booking creativeUrl
      if (remounting.newCreativeUrl) {
        booking.creativeUrl = remounting.newCreativeUrl;
      }
    }

    remounting.history.push({
      status,
      title: `Status Updated to ${status.toUpperCase().replace('_', ' ')}`,
      description: notes || adminNotes || `Status changed to ${status} by ${isAdmin ? 'Admin' : 'Site Owner'}.`,
      updatedAt: now,
      updatedBy: req.user.id,
      updatedByRole: req.user.role
    });

    booking.timeline.push({
      event: `remounting_${status}`,
      title: `Remounting ${requestId}: ${status.toUpperCase().replace('_', ' ')}`,
      description: notes || adminNotes || `Remounting status updated to ${status}.`,
      performedBy: req.user.id,
      performedByRole: req.user.role,
      timestamp: now
    });

    booking.markModified('remountingRequests');
    await booking.save();

    res.status(200).json({
      success: true,
      message: `Remounting request status successfully updated to '${status}'.`,
      remountingRequest: remounting,
      booking
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload proof photo for remounting with date & time
 * @route   POST /api/bookings/:id/remounting/:requestId/proof
 * @access  Private (Seller or Admin)
 */
exports.uploadRemountingProof = async (req, res, next) => {
  try {
    const { id, requestId } = req.params;
    const { proofPhotoUrl, proofCaptureDateTime, notes } = req.body;

    if (!proofPhotoUrl) {
      return res.status(400).json({ success: false, message: 'Please provide proofPhotoUrl.' });
    }

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    const isSeller = booking.sellerId.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isSeller && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized. Site owner or admin only.' });
    }

    const remounting = (booking.remountingRequests || []).find((r) => r.requestId === requestId);
    if (!remounting) {
      return res.status(404).json({ success: false, message: 'Remounting request not found.' });
    }

    const now = new Date();
    let finalPhotoUrl = proofPhotoUrl;
    if (proofPhotoUrl && proofPhotoUrl.startsWith('data:image/') && isCloudinaryConfigured) {
      try {
        const cloudRes = await uploadDataUriToCloudinary(proofPhotoUrl, { folder: 'adverse/remounting_proofs' });
        finalPhotoUrl = cloudRes.secure_url;
      } catch (cloudErr) {
        console.error('[RemountingProof] Failed to upload base64 to Cloudinary:', cloudErr.message);
      }
    }

    const captureTime = proofCaptureDateTime || now.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    remounting.status = 'proof_uploaded';
    remounting.proofPhotoUrl = finalPhotoUrl;
    remounting.proofCaptureDateTime = captureTime;
    remounting.proofUploadedAt = now;
    remounting.proofNotes = notes || '';
    remounting.proofUploadedBy = req.user.id;

    remounting.history.push({
      status: 'proof_uploaded',
      title: 'Remounting Proof Photo Uploaded',
      description: `Replacement proof photo stamped at ${captureTime} uploaded. Ready for client/admin verification.`,
      updatedAt: now,
      updatedBy: req.user.id,
      updatedByRole: req.user.role
    });

    booking.timeline.push({
      event: 'remounting_proof_uploaded',
      title: `Remounting Proof Uploaded (${requestId})`,
      description: `New vinyl proof photo (${captureTime}) uploaded by ${isAdmin ? 'Admin' : 'Site Owner'}.`,
      performedBy: req.user.id,
      performedByRole: req.user.role,
      timestamp: now
    });

    booking.markModified('remountingRequests');
    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Remounting proof photo uploaded successfully!',
      remountingRequest: remounting,
      booking
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Client or Admin verifies remounting installation
 * @route   PUT /api/bookings/:id/remounting/:requestId/verify
 * @access  Private (Customer of booking or Admin)
 */
exports.verifyRemountingProof = async (req, res, next) => {
  try {
    const { id, requestId } = req.params;
    const { verified = true, notes } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    const isCustomer = booking.customerId.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isCustomer && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized. Only the customer or admin can verify.' });
    }

    const remounting = (booking.remountingRequests || []).find((r) => r.requestId === requestId);
    if (!remounting) {
      return res.status(404).json({ success: false, message: 'Remounting request not found.' });
    }

    const now = new Date();

    if (verified) {
      remounting.status = 'completed';
      remounting.verifiedAt = now;
      remounting.verifiedBy = req.user.id;
      remounting.verificationNotes = notes || 'New flex mounting verified and accepted.';

      if (remounting.newCreativeUrl) {
        booking.creativeUrl = remounting.newCreativeUrl;
      }

      remounting.history.push({
        status: 'completed',
        title: `Remounting Verified & Completed`,
        description: `Installation verified by ${isAdmin ? 'Admin' : 'Customer'}. New flex is now live on the site.`,
        updatedAt: now,
        updatedBy: req.user.id,
        updatedByRole: req.user.role
      });

      booking.timeline.push({
        event: 'remounting_completed',
        title: `Remounting Completed (${requestId})`,
        description: `Verified by ${isAdmin ? 'Admin' : 'Customer'}. New flex live on site.`,
        performedBy: req.user.id,
        performedByRole: req.user.role,
        timestamp: now
      });
    } else {
      remounting.status = 'mounting'; // Needs rework
      remounting.verificationNotes = notes || 'Customer reported an issue with the remounting quality.';

      remounting.history.push({
        status: 'mounting',
        title: 'Remounting Issue Reported',
        description: notes || 'Installation issue reported. Crew instructed to adjust mounting.',
        updatedAt: now,
        updatedBy: req.user.id,
        updatedByRole: req.user.role
      });

      booking.timeline.push({
        event: 'remounting_issue_reported',
        title: `Remounting Issue Reported (${requestId})`,
        description: notes || 'Customer reported an issue with remounting installation.',
        performedBy: req.user.id,
        performedByRole: req.user.role,
        timestamp: now
      });
    }

    booking.markModified('remountingRequests');
    await booking.save();

    res.status(200).json({
      success: true,
      message: verified ? 'Remounting verified and marked as completed!' : 'Feedback submitted. Site crew notified to adjust.',
      remountingRequest: remounting,
      booking
    });
  } catch (error) {
    next(error);
  }
};
