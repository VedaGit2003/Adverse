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
 * e.g. https://res.cloudinary.com/dsdpnz2xz/image/upload/v1791737596/adverse/hoardings/ys5llbp39jces0wno4q7.png
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

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  uploadBufferToCloudinary,
  uploadDataUriToCloudinary,
  getPublicIdFromUrl,
  deleteFromCloudinary
};

