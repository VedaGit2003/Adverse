const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    paymentMode: {
      type: String,
      enum: ['online_gateway', 'cash', 'cheque', 'neft_rtgs_upi'],
      required: true
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
      index: true
    },
    offlineDetails: {
      transactionReference: { type: String, default: '' },
      bankName: { type: String, default: '' },
      receiptImageUrl: { type: String, default: '' },
      paymentDate: { type: Date, default: Date.now },
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      verifiedAt: { type: Date },
      verificationNotes: { type: String, default: '' }
    },
    gatewayDetails: {
      orderId: { type: String, default: '' },
      paymentId: { type: String, default: '' },
      signature: { type: String, default: '' }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', PaymentSchema);
