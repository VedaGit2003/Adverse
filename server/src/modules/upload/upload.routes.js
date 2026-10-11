const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken } = require('../../middlewares/auth.middleware');
const {
  isCloudinaryConfigured,
  uploadBufferToCloudinary,
  uploadDataUriToCloudinary
} = require('../../utils/cloudinary');

// Fallback local uploads directory
const uploadDir = path.resolve(__dirname, '../../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer memory storage (keeps file in memory buffer so we can stream directly to Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 } // 15 MB limit
});

/**
 * Helper to save buffer to local disk as fallback if Cloudinary is not configured or errors
 */
const saveBufferLocally = (file) => {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
  const filename = `${file.fieldname || 'upload'}-${uniqueSuffix}${ext}`;
  const filePath = path.join(uploadDir, filename);
  fs.writeFileSync(filePath, file.buffer);
  return `/uploads/${filename}`;
};

/**
 * @route   POST /api/upload/single
 * @desc    Upload a single file (Hoarding photo, mounting proof, payment receipt) to Cloudinary
 * @access  Private
 */
router.post('/single', verifyToken, upload.single('file'), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const folder = req.query.folder || req.body.folder || 'adverse/hoardings';

    if (isCloudinaryConfigured) {
      try {
        const result = await uploadBufferToCloudinary(file.buffer, { folder });
        return res.status(200).json({
          success: true,
          provider: 'cloudinary',
          fileUrl: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format
        });
      } catch (cloudErr) {
        console.error('[Upload] Cloudinary upload failed, falling back to local storage:', cloudErr.message);
      }
    }

    // Fallback: Local disk
    const localUrl = saveBufferLocally(file);
    return res.status(200).json({
      success: true,
      provider: 'local',
      fileUrl: localUrl
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/upload/multiple
 * @desc    Upload multiple files (up to 10 photos) to Cloudinary
 * @access  Private
 */
router.post('/multiple', verifyToken, upload.array('files', 10), async (req, res, next) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded.' });
    }

    const folder = req.query.folder || req.body.folder || 'adverse/hoardings';

    const uploadedUrls = [];

    for (const file of files) {
      if (isCloudinaryConfigured) {
        try {
          const result = await uploadBufferToCloudinary(file.buffer, { folder });
          uploadedUrls.push(result.secure_url);
          continue;
        } catch (cloudErr) {
          console.error('[Upload] Cloudinary multi-upload error on file:', cloudErr.message);
        }
      }
      // Local fallback
      uploadedUrls.push(saveBufferLocally(file));
    }

    return res.status(200).json({
      success: true,
      count: uploadedUrls.length,
      fileUrls: uploadedUrls
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/upload/base64
 * @desc    Upload a Base64 / Data URI image (e.g. from mobile camera or canvas) directly to Cloudinary
 * @access  Private
 */
router.post('/base64', verifyToken, async (req, res, next) => {
  try {
    const { image, folder } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, message: 'Base64 image string is required.' });
    }

    const targetFolder = folder || 'adverse/mounting_proofs';

    if (isCloudinaryConfigured) {
      const result = await uploadDataUriToCloudinary(image, { folder: targetFolder });
      return res.status(200).json({
        success: true,
        provider: 'cloudinary',
        fileUrl: result.secure_url,
        publicId: result.public_id,
        format: result.format
      });
    }

    // Local fallback for base64
    const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      const ext = matches[1].split('/')[1] || 'jpg';
      const buffer = Buffer.from(matches[2], 'base64');
      const filename = `base64-${Date.now()}.${ext}`;
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, buffer);
      return res.status(200).json({
        success: true,
        provider: 'local',
        fileUrl: `/uploads/${filename}`
      });
    }

    return res.status(400).json({ success: false, message: 'Invalid base64 image format.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
