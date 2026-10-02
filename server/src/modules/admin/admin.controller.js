const User = require('../../models/User');
const Hoarding = require('../../models/Hoarding');
const Booking = require('../../models/Booking');
const Payment = require('../../models/Payment');

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
        hoardings: { total: totalHoardings, approved: approvedHoardings, pendingModeration: pendingHoardings, available: availableHoardings, occupied: occupiedHoardings },
        bookings: { total: totalBookings, active: activeBookings },
        financials: { totalVerifiedRevenueINR: totalRevenue }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const { role, status, search } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    const users = await User.find(filter).select('-passwordHash').sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    next(error);
  }
};

exports.moderateHoarding = async (req, res, next) => {
  try {
    const { isApproved } = req.body;
    const hoarding = await Hoarding.findByIdAndUpdate(
      req.params.id,
      { isApprovedByAdmin: isApproved !== false },
      { new: true }
    );
    if (!hoarding) return res.status(404).json({ success: false, message: 'Hoarding not found.' });
    res.status(200).json({ success: true, message: `Hoarding ${hoarding.isApprovedByAdmin ? 'approved' : 'unapproved'}.`, hoarding });
  } catch (error) {
    next(error);
  }
};
