const User = require('../../models/User');
const Hoarding = require('../../models/Hoarding');
const Booking = require('../../models/Booking');
const Payment = require('../../models/Payment');

/**
 * @desc    Get overall platform analytics & stats
 * @route   GET /api/admin/metrics
 * @access  Private (Admin only)
 */
exports.getPlatformMetrics = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const totalSellers = await User.countDocuments({ role: 'seller' });

    const totalHoardings = await Hoarding.countDocuments();
    const approvedHoardings = await Hoarding.countDocuments({ isApprovedByAdmin: true });
    const pendingHoardings = await Hoarding.countDocuments({ isApprovedByAdmin: false });
    const availableHoardings = await Hoarding.countDocuments({ availabilityStatus: 'available' });
    const occupiedHoardings = await Hoarding.countDocuments({ availabilityStatus: 'occupied' });

    const totalBookings = await Booking.countDocuments();
    const activeBookings = await Booking.countDocuments({ bookingStatus: { $in: ['confirmed', 'active'] } });

    const revenueAgg = await Payment.aggregate([
      { $match: { paymentStatus: 'verified' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

    res.status(200).json({
      success: true,
      metrics: {
        users: { total: totalUsers, customers: totalCustomers, sellers: totalSellers },
        hoardings: {
          total: totalHoardings,
          approved: approvedHoardings,
          pendingModeration: pendingHoardings,
          available: availableHoardings,
          occupied: occupiedHoardings
        },
        bookings: { total: totalBookings, active: activeBookings },
        financials: { totalVerifiedRevenueINR: totalRevenue }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all hoarding listings with full details and seller info for Admin
 * @route   GET /api/admin/hoardings
 * @access  Private (Admin only)
 */
exports.getHoardingsAdmin = async (req, res, next) => {
  try {
    const { search, city, status, approved } = req.query;
    const filter = {};

    if (city) filter['location.city'] = { $regex: city, $options: 'i' };
    if (status) filter.availabilityStatus = status;
    if (approved !== undefined && approved !== '') {
      filter.isApprovedByAdmin = approved === 'true';
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { 'location.address': { $regex: search, $options: 'i' } },
        { 'location.city': { $regex: search, $options: 'i' } }
      ];
    }

    const hoardings = await Hoarding.find(filter)
      .populate('sellerId', 'name email phone companyDetails')
      .sort({ createdAt: -1 })
      .lean();

    // Attach active booking info
    const enrichedHoardings = await Promise.all(
      hoardings.map(async (h) => {
        const activeCount = await Booking.countDocuments({
          hoardingId: h._id,
          bookingStatus: { $in: ['confirmed', 'active'] }
        });
        return {
          ...h,
          activeBookingsCount: activeCount
        };
      })
    );

    res.status(200).json({
      success: true,
      count: enrichedHoardings.length,
      hoardings: enrichedHoardings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all bookings (active, confirmed, requested, completed) with customer & seller details
 * @route   GET /api/admin/bookings
 * @access  Private (Admin only)
 */
exports.getBookingsAdmin = async (req, res, next) => {
  try {
    const { status, paymentStatus, search } = req.query;
    const filter = {};

    if (status === 'active') {
      filter.bookingStatus = { $in: ['active', 'confirmed'] };
    } else if (status && status !== 'all') {
      filter.bookingStatus = status;
    }
    if (paymentStatus && paymentStatus !== 'all') filter.paymentStatus = paymentStatus;
    if (search) {
      filter.$or = [
        { bookingNumber: { $regex: search, $options: 'i' } },
        { campaignName: { $regex: search, $options: 'i' } }
      ];
    }

    const bookings = await Booking.find(filter)
      .populate('hoardingId', 'title location dimensions lightingType photos pricing')
      .populate('customerId', 'name email phone companyDetails')
      .populate('sellerId', 'name email phone companyDetails')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all customer users with booking counts
 * @route   GET /api/admin/users
 * @access  Private (Admin only)
 */
exports.getUsers = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const filter = { role: 'customer' };

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { 'companyDetails.companyName': { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter).select('-passwordHash').sort({ createdAt: -1 }).lean();

    const enrichedUsers = await Promise.all(
      users.map(async (u) => {
        const bookingsCount = await Booking.countDocuments({ customerId: u._id });
        const spentAgg = await Payment.aggregate([
          { $match: { customerId: u._id, paymentStatus: 'verified' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalSpent = spentAgg.length > 0 ? spentAgg[0].total : 0;

        return {
          ...u,
          bookingsCount,
          totalSpent
        };
      })
    );

    res.status(200).json({
      success: true,
      count: enrichedUsers.length,
      users: enrichedUsers
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all seller site owners with their hoardings count and revenue
 * @route   GET /api/admin/sellers
 * @access  Private (Admin only)
 */
exports.getSellersAdmin = async (req, res, next) => {
  try {
    const { status, search } = req.query;
    const filter = { role: 'seller' };

    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { 'companyDetails.companyName': { $regex: search, $options: 'i' } }
      ];
    }

    const sellers = await User.find(filter).select('-passwordHash').sort({ createdAt: -1 }).lean();

    const enrichedSellers = await Promise.all(
      sellers.map(async (s) => {
        const hoardingsCount = await Hoarding.countDocuments({ sellerId: s._id });
        const bookingsCount = await Booking.countDocuments({ sellerId: s._id });
        const revenueAgg = await Payment.aggregate([
          { $match: { sellerId: s._id, paymentStatus: 'verified' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        const totalEarned = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

        return {
          ...s,
          hoardingsCount,
          bookingsCount,
          totalEarned
        };
      })
    );

    res.status(200).json({
      success: true,
      count: enrichedSellers.length,
      sellers: enrichedSellers
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Moderate hoarding (Approve/Reject)
 * @route   PUT /api/admin/hoardings/:id/approve
 * @access  Private (Admin only)
 */
exports.moderateHoarding = async (req, res, next) => {
  try {
    const { isApproved } = req.body;
    const hoarding = await Hoarding.findByIdAndUpdate(
      req.params.id,
      { isApprovedByAdmin: isApproved !== false },
      { new: true }
    ).populate('sellerId', 'name email phone companyDetails');

    if (!hoarding) {
      return res.status(404).json({ success: false, message: 'Hoarding not found.' });
    }

    res.status(200).json({
      success: true,
      message: `Hoarding ${hoarding.isApprovedByAdmin ? 'approved' : 'unapproved'}.`,
      hoarding
    });
  } catch (error) {
    next(error);
  }
};
