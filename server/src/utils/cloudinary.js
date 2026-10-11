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

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  uploadBufferToCloudinary,
  uploadDataUriToCloudinary
};
