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
      enum: [
        'requested',              // Step 1: Customer requests site booking
        'approved',               // Step 2: Seller/Admin approves -> Payment option unlocked
        'rejected',               // Seller/Admin rejects request
        'mounting_window',        // Step 3: Payment done -> 3-day mounting window begins
        'verification_pending',   // Step 4: Seller uploaded proof photo -> 4-hour verify countdown
        'active',                 // Step 5: Verified (or 4h expired) -> Subscription active!
        'completed',              // Campaign subscription term ended
        'cancelled',
        'confirmed'               // Backward-compat alias
      ],
      default: 'requested',
      index: true
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'partially_paid', 'paid', 'refunded'],
      default: 'pending',
      index: true
    },
    sellerApproval: {
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
      },
      actionBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      actionAt: {
        type: Date,
        default: null
      },
      notes: {
        type: String,
        default: ''
      }
    },
    paymentConfirmation: {
      paidAt: { type: Date, default: null },
      paymentMode: { type: String, default: '' },
      transactionReference: { type: String, default: '' },
      receiptImageUrl: { type: String, default: '' },
      bankName: { type: String, default: '' },
      confirmedToSeller: { type: Boolean, default: false },
      confirmedToAdmin: { type: Boolean, default: false },
      confirmedAt: { type: Date, default: null }
    },
    mountingDetails: {
      windowStartedAt: { type: Date, default: null },
      windowEndsAt: { type: Date, default: null }, // windowStartedAt + 3 days (72 hours)

      // Phase 1: Flex Pick up by seller from customer
      flexPickupStatus: {
        type: String,
        enum: ['pending', 'in_progress', 'completed'],
        default: 'pending'
      },
      flexPickupCompletedAt: { type: Date, default: null },
      flexPickupNotes: { type: String, default: '' },
      flexPickupUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

      // Phase 2: Mounting
      mountingStatus: {
        type: String,
        enum: ['pending', 'in_progress', 'completed'],
        default: 'pending'
      },
      mountingCompletedAt: { type: Date, default: null },
      mountingNotes: { type: String, default: '' },
      mountingUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

      // Phase 3: Confirmation (Photo upload with date and time)
      confirmationStatus: {
        type: String,
        enum: ['pending', 'proof_uploaded', 'verified', 'rejected'],
        default: 'pending'
      },
      proofPhotoUrl: { type: String, default: '' },
      proofCaptureDateTime: { type: String, default: '' }, // e.g., "10 Oct 2026, 02:30 PM"
      proofUploadedAt: { type: Date, default: null },
      proofNotes: { type: String, default: '' },
      proofUploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

      // 4-Hour Customer/Admin Verification Window
      verificationWindowStartedAt: { type: Date, default: null },
      verificationWindowExpiresAt: { type: Date, default: null }, // proofUploadedAt + 4 hours
      customerVerified: { type: Boolean, default: false },
      customerVerifiedAt: { type: Date, default: null },
      customerNotes: { type: String, default: '' },
      adminVerified: { type: Boolean, default: false },
      adminVerifiedAt: { type: Date, default: null },
      adminNotes: { type: String, default: '' }
    },
    subscriptionStartDate: {
      type: Date,
      default: null
    },
    subscriptionEndDate: {
      type: Date,
      default: null
    },
    timeline: [
      {
        event: { type: String, required: true },
        title: { type: String, required: true },
        description: { type: String, default: '' },
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        performedByRole: { type: String, default: '' },
        timestamp: { type: Date, default: Date.now }
      }
    ],
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
BookingSchema.index({ bookingStatus: 1, 'mountingDetails.verificationWindowExpiresAt': 1 });

module.exports = mongoose.model('Booking', BookingSchema);
