const Booking = require('../../models/Booking');
const Hoarding = require('../../models/Hoarding');
const Payment = require('../../models/Payment');

function generateBookingNumber() {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const timestamp = Date.now().toString().slice(-4);
  return `BK-WB-${timestamp}-${randomSuffix}`;
}

exports.createBooking = async (req, res, next) => {
  try {
    const {
      hoardingId,
      startDate,
      endDate,
      bookingType = 'offline',
      campaignName,
      clientNotes,
      paymentMode = 'neft_rtgs_upi',
      transactionReference,
      bankName,
      receiptImageUrl,
      includePrinting = false,
      includeMounting = false
    } = req.body;

    if (!hoardingId || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Please provide hoardingId, startDate, and endDate.' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      return res.status(400).json({ success: false, message: 'Invalid dates.' });
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

    const overlapping = await Booking.find({
      hoardingId: hoarding._id,
      bookingStatus: { $in: ['confirmed', 'active'] },
      $or: [{ startDate: { $lte: end }, endDate: { $gte: start } }]
    });

    if (overlapping.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This hoarding site is already booked for the selected dates.'
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
      bookingStatus: 'requested',
      paymentStatus: 'pending',
      campaignName: campaignName || '',
      clientNotes: clientNotes || ''
    });

    const payment = await Payment.create({
      bookingId: booking._id,
      customerId: req.user.id,
      sellerId: hoarding.sellerId,
      amount: totalAmount,
      paymentMode,
      paymentStatus: 'pending',
      offlineDetails: {
        transactionReference: transactionReference || '',
        bankName: bankName || '',
        receiptImageUrl: receiptImageUrl || '',
        paymentDate: new Date()
      }
    });

    res.status(201).json({ success: true, message: 'Booking created successfully.', booking, payment });
  } catch (error) {
    next(error);
  }
};

exports.getMyBookings = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === 'customer') filter.customerId = req.user.id;
    else if (req.user.role === 'seller') filter.sellerId = req.user.id;

    const bookings = await Booking.find(filter)
      .populate('hoardingId', 'title location dimensions lightingType photos pricing')
      .populate('customerId', 'name email phone companyDetails')
      .populate('sellerId', 'name email phone companyDetails')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    next(error);
  }
};

exports.getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('hoardingId')
      .populate('customerId', 'name email phone companyDetails')
      .populate('sellerId', 'name email phone companyDetails');

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    const payments = await Payment.find({ bookingId: booking._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, booking, payments });
  } catch (error) {
    next(error);
  }
};

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
