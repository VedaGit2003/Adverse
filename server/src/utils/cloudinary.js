const cloudinary = require('cloudinary').v2;
const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = require('../config/env');

const isCloudinaryConfigured = Boolean(
  CLOUDINARY_CLOUD_NAME &&
  CLOUDINARY_API_KEY &&
  CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true
  });
  console.log(`[Cloudinary] Configured successfully for cloud: ${CLOUDINARY_CLOUD_NAME}`);
} else {
  console.warn('[Cloudinary] Warning: Credentials not fully configured. Falling back to local storage.');
}

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} buffer - File buffer from multer memory storage
 * @param {Object} options - Upload options (folder, tags, transformations)
 * @returns {Promise<Object>} Cloudinary upload result
 */
const uploadBufferToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    if (!isCloudinaryConfigured) {
      return reject(new Error('Cloudinary credentials are not configured.'));
    }

    const uploadOptions = {
      folder: options.folder || 'adverse/uploads',
      resource_type: 'auto',
      ...options
    };

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });

    stream.end(buffer);
  });
};

/**
 * Upload a local file path or Base64 / Data URI to Cloudinary
 * @param {string} fileOrDataUri - File path or data:image/... base64 string
 * @param {Object} options - Upload options (folder, etc.)
 * @returns {Promise<Object>} Cloudinary upload result
 */
const uploadDataUriToCloudinary = async (fileOrDataUri, options = {}) => {
  if (!isCloudinaryConfigured) {
    throw new Error('Cloudinary credentials are not configured.');
  }

  const uploadOptions = {
    folder: options.folder || 'adverse/uploads',
    resource_type: 'auto',
    ...options
  };

  return await cloudinary.uploader.upload(fileOrDataUri, uploadOptions);
};

/**
 * Extract Cloudinary public_id from a URL
 * e.g. https://res.cloudinary.com/<cloud_name>/image/upload/v1791737596/adverse/hoardings/ys5llbp39jces0wno4q7.png
 * => adverse/hoardings/ys5llbp39jces0wno4q7
 */
const getPublicIdFromUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  if (!url.includes('cloudinary.com')) return null;

  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/');
    const uploadIndex = parts.indexOf('upload');
    if (uploadIndex === -1) return null;

    let pathParts = parts.slice(uploadIndex + 1);
    // Ignore transformations or version tags (v123456)
    while (
      pathParts.length > 0 &&
      ((pathParts[0].startsWith('v') && /^\d+$/.test(pathParts[0].substring(1))) ||
        pathParts[0].includes(','))
    ) {
      pathParts.shift();
    }
    const fullPathWithExt = pathParts.join('/');
    const lastDotIndex = fullPathWithExt.lastIndexOf('.');
    return lastDotIndex !== -1 ? fullPathWithExt.substring(0, lastDotIndex) : fullPathWithExt;
  } catch (e) {
    return null;
  }
};

/**
 * Delete an image from Cloudinary by public_id or full URL
 * @param {string} publicIdOrUrl - The full Cloudinary URL or public_id
 * @returns {Promise<Object>} Cloudinary destroy result
 */
const deleteFromCloudinary = async (publicIdOrUrl) => {
  if (!isCloudinaryConfigured) {
    return { result: 'not_configured' };
  }

  let publicId = publicIdOrUrl;
  if (typeof publicIdOrUrl === 'string' && publicIdOrUrl.startsWith('http')) {
    publicId = getPublicIdFromUrl(publicIdOrUrl);
  }

  if (!publicId) {
    console.warn(`[Cloudinary] Could not extract public_id from: ${publicIdOrUrl}`);
    return { result: 'not_found' };
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`[Cloudinary] Destroy asset '${publicId}' result:`, result);
    return result;
  } catch (err) {
    console.error(`[Cloudinary] Error destroying asset '${publicId}':`, err);
    throw err;
  }
};

/**
 * Upload a watermarked mounting/remounting proof to Cloudinary.
 * Embeds GPS coordinates, timestamp, distance in meters and site verification badge.
 * @param {string} fileOrDataUri - Base64 or local file path
 * @param {Object} metadata - { hoardingCode, latitude, longitude, distanceMeters, isWithinGeofence, timestamp }
 * @returns {Promise<Object>} Cloudinary upload result
 */
const uploadWatermarkedProofToCloudinary = async (fileOrDataUri, metadata = {}) => {
  if (!isCloudinaryConfigured) {
    throw new Error('Cloudinary credentials are not configured.');
  }

  const {
    hoardingCode = 'ADVERSE',
    latitude,
    longitude,
    distanceMeters,
    timestamp = new Date(),
    isWithinGeofence
  } = metadata;

  const dateStr = new Date(timestamp).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  let stampText = `ADVERSE PROOF | ${hoardingCode}`;
  if (latitude !== undefined && longitude !== undefined && latitude !== null && longitude !== null) {
    const latStr = Number(latitude).toFixed(4);
    const lngStr = Number(longitude).toFixed(4);
    const distStr = distanceMeters !== undefined && distanceMeters !== null ? `${distanceMeters}m from site` : '';
    const statusStr = isWithinGeofence === true ? 'VERIFIED ON-SITE' : (isWithinGeofence === false ? 'OUTSIDE GEOFENCE' : 'RECORDED');
    stampText = `ADVERSE ${statusStr} | LAT ${latStr} LNG ${lngStr} | ${distStr ? distStr + ' | ' : ''}${dateStr}`;
  } else {
    stampText = `ADVERSE PROOF | ${hoardingCode} | ${dateStr}`;
  }

  const safeText = encodeURIComponent(stampText.replace(/,/g, ' ').replace(/\//g, '-'));

  const uploadOptions = {
    folder: metadata.folder || 'adverse/mounting_proofs',
    resource_type: 'auto',
    transformation: [
      { width: 1400, crop: 'limit' },
      {
        overlay: {
          font_family: 'Arial',
          font_size: 20,
          font_weight: 'bold',
          text: safeText
        },
        color: '#FFFFFF',
        background: '#000000B3',
        gravity: 'south',
        y: 16,
        flags: 'layer_apply'
      }
    ]
  };

  try {
    return await cloudinary.uploader.upload(fileOrDataUri, uploadOptions);
  } catch (err) {
    console.warn('[Cloudinary] Watermark overlay transform failed, uploading clean original as fallback:', err.message);
    return await cloudinary.uploader.upload(fileOrDataUri, {
      folder: metadata.folder || 'adverse/mounting_proofs',
      resource_type: 'auto',
      transformation: [{ width: 1400, crop: 'limit' }]
    });
  }
};


module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  uploadBufferToCloudinary,
  uploadDataUriToCloudinary,
  uploadWatermarkedProofToCloudinary,
  getPublicIdFromUrl,
  deleteFromCloudinary
};

