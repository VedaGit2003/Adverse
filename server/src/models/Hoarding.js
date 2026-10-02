const mongoose = require('mongoose');

const HoardingSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: [true, 'Please provide a hoarding title or landmark reference'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters']
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    hoardingType: {
      type: String,
      enum: ['Unipole', 'Billboard', 'Gantry', 'Bridge Panel', 'Kiosk', 'LED Digital Screen'],
      default: 'Billboard'
    },
    lightingType: {
      type: String,
      enum: ['Frontlit', 'Backlit', 'Digital/LED', 'Non-lit'],
      default: 'Frontlit'
    },
    dimensions: {
      width: { type: Number, required: true },
      height: { type: Number, required: true },
      unit: { type: String, default: 'feet' }
    },
    location: {
      address: { type: String, required: true },
      city: { type: String, required: true, index: true },
      district: { type: String, default: '' },
      landmark: { type: String, default: '' },
      pincode: { type: String, default: '' },
      geo: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point'
        },
        coordinates: {
          type: [Number],
          required: true
        }
      }
    },
    pricing: {
      baseRatePerMonth: { type: Number, required: true },
      baseRatePerDay: { type: Number, default: 0 },
      minimumBookingDays: { type: Number, default: 15 },
      printingCostEstimate: { type: Number, default: 0 },
      mountingCostEstimate: { type: Number, default: 0 }
    },
    photos: {
      type: [String],
      default: []
    },
    availabilityStatus: {
      type: String,
      enum: ['available', 'occupied', 'under_maintenance', 'inactive'],
      default: 'available',
      index: true
    },
    isApprovedByAdmin: {
      type: Boolean,
      default: true,
      index: true
    },
    viewCount: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

HoardingSchema.index({ 'location.geo': '2dsphere' });
HoardingSchema.index({ 'location.city': 'text', title: 'text', description: 'text' });

module.exports = mongoose.model('Hoarding', HoardingSchema);
