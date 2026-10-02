const Payment = require('../../models/Payment');
const Booking = require('../../models/Booking');

exports.recordOfflinePayment = async (req, res, next) => {
  try {
    const { bookingId, amount, paymentMode, transactionReference, bankName, receiptImageUrl } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found.' });

    const payment = await Payment.create({
      bookingId: booking._id,
      customerId: booking.customerId,
      sellerId: booking.sellerId,
      amount: amount || booking.totalAmount,
      paymentMode: paymentMode || 'neft_rtgs_upi',
      paymentStatus: 'pending',
      offlineDetails: {
        transactionReference: transactionReference || '',
        bankName: bankName || '',
        receiptImageUrl: receiptImageUrl || '',
        paymentDate: new Date()
      }
    });

    res.status(201).json({ success: true, message: 'Offline payment record submitted.', payment });
  } catch (error) {
    next(error);
  }
};

exports.verifyPayment = async (req, res, next) => {
  try {
    const { verificationNotes } = req.body;
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found.' });

    if (payment.sellerId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    payment.paymentStatus = 'verified';
    payment.offlineDetails.verifiedBy = req.user.id;
    payment.offlineDetails.verifiedAt = new Date();
    if (verificationNotes) payment.offlineDetails.verificationNotes = verificationNotes;
    await payment.save();

    const booking = await Booking.findById(payment.bookingId);
    if (booking) {
      booking.paymentStatus = 'paid';
      booking.bookingStatus = 'confirmed';
      await booking.save();
    }

    res.status(200).json({ success: true, message: 'Payment verified and booking confirmed.', payment, booking });
  } catch (error) {
    next(error);
  }
};

exports.rejectPayment = async (req, res, next) => {
  try {
    const { verificationNotes } = req.body;
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment record not found.' });

    payment.paymentStatus = 'rejected';
    payment.offlineDetails.verifiedBy = req.user.id;
    payment.offlineDetails.verifiedAt = new Date();
    payment.offlineDetails.verificationNotes = verificationNotes || 'Payment rejected.';
    await payment.save();

    res.status(200).json({ success: true, message: 'Payment rejected.', payment });
  } catch (error) {
    next(error);
  }
};

exports.getAllPayments = async (req, res, next) => {
  try {
    const filter = {};
    if (req.user.role === 'seller') filter.sellerId = req.user.id;

    const payments = await Payment.find(filter)
      .populate('bookingId')
      .populate('customerId', 'name email phone')
      .populate('sellerId', 'name email phone')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: payments.length, payments });
  } catch (error) {
    next(error);
  }
};
