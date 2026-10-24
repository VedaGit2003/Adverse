const PlatformSetting = require('../../models/PlatformSetting');

let memorySettingsCache = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 15000; // 15 seconds cache

/**
 * Internal helper to retrieve active platform settings
 */
const getPlatformSettings = async () => {
  const now = Date.now();
  if (memorySettingsCache && now - lastCacheTime < CACHE_TTL_MS) {
    return memorySettingsCache;
  }

  let settings = await PlatformSetting.findOne({ key: 'global_config' });
  if (!settings) {
    settings = await PlatformSetting.create({
      key: 'global_config',
      gpsVerificationEnabled: true,
      geofenceRadiusMeters: 500,
      watermarkEnabled: true,
      lastUpdatedByName: 'System Default'
    });
  }

  memorySettingsCache = settings;
  lastCacheTime = now;
  return settings;
};

/**
 * @route   GET /api/settings
 * @desc    Get public platform feature settings (GPS toggle, watermark, radius)
 * @access  Public / Authenticated
 */
const getSettings = async (req, res, next) => {
  try {
    const settings = await getPlatformSettings();
    res.status(200).json({
      success: true,
      settings: {
        gpsVerificationEnabled: settings.gpsVerificationEnabled,
        geofenceRadiusMeters: settings.geofenceRadiusMeters,
        watermarkEnabled: settings.watermarkEnabled,
        lastUpdatedByName: settings.lastUpdatedByName,
        updatedAt: settings.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/settings
 * @desc    Admin switches GPS verification feature ON/OFF or updates radius
 * @access  Private (Admin only)
 */
const updateSettings = async (req, res, next) => {
  try {
    const { gpsVerificationEnabled, geofenceRadiusMeters, watermarkEnabled } = req.body;

    let settings = await PlatformSetting.findOne({ key: 'global_config' });
    if (!settings) {
      settings = new PlatformSetting({ key: 'global_config' });
    }

    if (typeof gpsVerificationEnabled === 'boolean') {
      settings.gpsVerificationEnabled = gpsVerificationEnabled;
    }

    if (typeof watermarkEnabled === 'boolean') {
      settings.watermarkEnabled = watermarkEnabled;
    }

    if (geofenceRadiusMeters !== undefined && geofenceRadiusMeters !== null) {
      const parsedRadius = Number(geofenceRadiusMeters);
      if (!isNaN(parsedRadius) && parsedRadius >= 50 && parsedRadius <= 10000) {
        settings.geofenceRadiusMeters = parsedRadius;
      }
    }

    if (req.user) {
      settings.lastUpdatedBy = req.user.id;
      settings.lastUpdatedByName = req.user.name || req.user.email || 'Admin';
    }

    await settings.save();

    // Invalidate cache immediately
    memorySettingsCache = settings;
    lastCacheTime = Date.now();

    res.status(200).json({
      success: true,
      message: `GPS Geofence & Watermark feature successfully switched ${settings.gpsVerificationEnabled ? 'ON' : 'OFF'}.`,
      settings: {
        gpsVerificationEnabled: settings.gpsVerificationEnabled,
        geofenceRadiusMeters: settings.geofenceRadiusMeters,
        watermarkEnabled: settings.watermarkEnabled,
        lastUpdatedByName: settings.lastUpdatedByName,
        updatedAt: settings.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPlatformSettings,
  getSettings,
  updateSettings
};
