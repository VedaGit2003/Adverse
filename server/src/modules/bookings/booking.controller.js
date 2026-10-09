const Booking = require('../../models/Booking');
const Hoarding = require('../../models/Hoarding');
const Payment = require('../../models/Payment');

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
  }
  return booking;
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
    const { proofPhotoUrl, proofCaptureDateTime, notes } = req.body;

    if (!proofPhotoUrl) {
      return res.status(400).json({ success: false, message: 'Please provide proofPhotoUrl.' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    if (booking.sellerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized. Site owner or admin only.' });
    }

    const now = new Date();
    const verificationExpires = new Date(now.getTime() + DEFAULT_VERIFICATION_WINDOW_HOURS * 60 * 60 * 1000); // Configurable customer verification countdown window (default 4 hours)

    if (!booking.mountingDetails) booking.mountingDetails = {};

    booking.mountingDetails.mountingStatus = 'completed';
    booking.mountingDetails.confirmationStatus = 'proof_uploaded';
    booking.mountingDetails.proofPhotoUrl = proofPhotoUrl;
    booking.mountingDetails.proofCaptureDateTime =
      proofCaptureDateTime || now.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    booking.mountingDetails.proofUploadedAt = now;
    booking.mountingDetails.proofNotes = notes || '';
    booking.mountingDetails.proofUploadedBy = req.user.id;

    // Start Customer/Admin Verification Window
    booking.mountingDetails.verificationWindowStartedAt = now;
    booking.mountingDetails.verificationWindowExpiresAt = verificationExpires;
    booking.bookingStatus = 'verification_pending';

    booking.timeline.push({
      event: 'phase3_proof_uploaded',
      title: 'Phase 3 (Confirmation): Proof Photo Uploaded',
      description: `Hoarding photo with date & time (${booking.mountingDetails.proofCaptureDateTime}) uploaded. Verification window started. Customer and Admin have ${DEFAULT_VERIFICATION_WINDOW_HOURS} hours to verify before campaign activates.`,
      performedBy: req.user.id,
      performedByRole: req.user.role,
      timestamp: now
    });

    await booking.save();

    res.status(200).json({
      success: true,
      message: 'Mounting proof uploaded! 4-hour verification window has started.',
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

    if (bookingStatus) booking.bookingStatus = bookingStatus;
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
    await booking.save();
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
