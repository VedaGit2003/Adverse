const mongoose = require('mongoose');

const PlatformSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: 'global_config'
    },
    // GPS Geofence & Watermark Verification Feature Toggle (Admin Controlled)
    gpsVerificationEnabled: {
      type: Boolean,
      default: true
    },
    geofenceRadiusMeters: {
      type: Number,
      default: 500,
      min: 50,
      max: 10000
    },
    watermarkEnabled: {
      type: Boolean,
      default: true
    },
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastUpdatedByName: {
      type: String,
      default: 'Admin'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PlatformSetting', PlatformSettingSchema);
