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
      proofGeoLocation: {
        latitude: { type: Number, default: null },
        longitude: { type: Number, default: null },
        accuracy: { type: Number, default: null },
        distanceMetersFromHoarding: { type: Number, default: null },
        isWithinGeofence: { type: Boolean, default: null },
        verifiedOnSite: { type: Boolean, default: false },
        deviceAddress: { type: String, default: '' },
        source: { type: String, enum: ['mobile_gps', 'web_geolocation', 'manual'], default: 'manual' },
        capturedAt: { type: Date, default: null }
      },

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
    },
    remountingRequests: [
      {
        requestId: {
          type: String,
          required: true
        },
        requestedAt: {
          type: Date,
          default: Date.now
        },
        requestedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        dimensions: {
          width: { type: Number, default: 0 },
          height: { type: Number, default: 0 },
          unit: { type: String, default: 'feet' }
        },
        areaSqFt: {
          type: Number,
          required: true
        },
        ratePerSqFt: {
          type: Number,
          default: 3 // Fixed 3 Rs per sq.ft rate
        },
        totalAmount: {
          type: Number,
          required: true
        },
        campaignName: {
          type: String,
          default: ''
        },
        newCreativeUrl: {
          type: String,
          default: ''
        },
        notes: {
          type: String,
          default: ''
        },
        pickupAddress: {
          type: String,
          default: ''
        },
        status: {
          type: String,
          enum: [
            'requested',        // Step 1: Client submits remounting request
            'approved',         // Step 2: Approved by Seller/Admin -> Ready for payment
            'paid',             // Step 3: ₹3/sqft paid -> Mounting window begins
            'flex_pickup',      // Step 4: Flex banner picked up from customer
            'mounting',         // Step 5: Mounting crew on site replacing flex
            'proof_uploaded',   // Step 6: Replacement proof photo uploaded with date/time
            'completed',        // Step 7: Verified & remounting completed
            'rejected',
            'cancelled'
          ],
          default: 'requested'
        },
        paymentStatus: {
          type: String,
          enum: ['pending', 'paid', 'waived', 'refunded'],
          default: 'pending'
        },
        paymentDetails: {
          paidAt: { type: Date, default: null },
          paymentMode: { type: String, default: '' },
          transactionReference: { type: String, default: '' },
          receiptImageUrl: { type: String, default: '' },
          confirmedAt: { type: Date, default: null }
        },
        flexPickupCompletedAt: { type: Date, default: null },
        mountingCompletedAt: { type: Date, default: null },
        proofPhotoUrl: { type: String, default: '' },
        proofCaptureDateTime: { type: String, default: '' },
        proofUploadedAt: { type: Date, default: null },
        proofNotes: { type: String, default: '' },
        proofUploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        proofGeoLocation: {
          latitude: { type: Number, default: null },
          longitude: { type: Number, default: null },
          accuracy: { type: Number, default: null },
          distanceMetersFromHoarding: { type: Number, default: null },
          isWithinGeofence: { type: Boolean, default: null },
          verifiedOnSite: { type: Boolean, default: false },
          deviceAddress: { type: String, default: '' },
          source: { type: String, enum: ['mobile_gps', 'web_geolocation', 'manual'], default: 'manual' },
          capturedAt: { type: Date, default: null }
        },
        verifiedAt: { type: Date, default: null },
        verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        verificationNotes: { type: String, default: '' },
        adminNotes: { type: String, default: '' },
        history: [
          {
            status: { type: String, required: true },
            title: { type: String, default: '' },
            description: { type: String, default: '' },
            updatedAt: { type: Date, default: Date.now },
            updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            updatedByRole: { type: String, default: '' }
          }
        ]
      }
    ]
  },
  { timestamps: true }
);

BookingSchema.index({ hoardingId: 1, startDate: 1, endDate: 1 });
BookingSchema.index({ bookingStatus: 1, 'mountingDetails.verificationWindowExpiresAt': 1 });
BookingSchema.index({ 'remountingRequests.status': 1 });

module.exports = mongoose.model('Booking', BookingSchema);
