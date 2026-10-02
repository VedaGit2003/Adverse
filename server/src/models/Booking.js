const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema(
  {
    bookingNumber: {
      type: String,
      required: true,
      unique: true
    },
    hoardingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hoarding',
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
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    durationDays: {
      type: Number,
      required: true
    },
    rentAmount: {
      type: Number,
      required: true
    },
    printingAmount: {
      type: Number,
      default: 0
    },
    mountingAmount: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      required: true
    },
    bookingType: {
      type: String,
      enum: ['online', 'offline'],
      default: 'online'
    },
    bookingStatus: {
      type: String,
      enum: ['requested', 'confirmed', 'active', 'completed', 'cancelled'],
      default: 'requested',
      index: true
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'partially_paid', 'paid', 'refunded'],
      default: 'pending',
      index: true
    },
    campaignName: {
      type: String,
      default: ''
    },
    creativeUrl: {
      type: String,
      default: ''
    },
    clientNotes: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

BookingSchema.index({ hoardingId: 1, startDate: 1, endDate: 1 });

module.exports = mongoose.model('Booking', BookingSchema);
