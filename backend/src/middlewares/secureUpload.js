const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

/**
 * Secure file upload middleware using multer
 * Replaces vulnerable express-fileupload package
 * Implements security best practices for file uploads
 */

// Define allowed file types and their MIME types
const ALLOWED_FILE_TYPES = {
  images: {
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    mimes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  },
  documents: {
    extensions: ['.pdf', '.doc', '.docx', '.txt', '.rtf'],
    mimes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'application/rtf']
  },
  spreadsheets: {
    extensions: ['.xls', '.xlsx', '.csv'],
    mimes: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv']
  }
};

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
  image: 5 * 1024 * 1024,      // 5MB for images
  document: 10 * 1024 * 1024,   // 10MB for documents  
  default: 2 * 1024 * 1024      // 2MB default
};

// Storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate secure filename with timestamp and cryptographically secure random string
    const timestamp = Date.now();
    const randomString = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '');
    const filename = `${timestamp}_${randomString}_${sanitizedName}`;
    cb(null, filename);
  }
});

// File filter function for security validation
const fileFilter = function (req, file, cb) {
  try {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();

    // Check if file extension and MIME type are allowed
    let isAllowed = false;
    
    for (const category of Object.values(ALLOWED_FILE_TYPES)) {
      if (category.extensions.includes(ext) && category.mimes.includes(mime)) {
        isAllowed = true;
        break;
      }
    }

    if (!isAllowed) {
      return cb(new Error(`File type not allowed. Extension: ${ext}, MIME: ${mime}`), false);
    }

    // Additional security: Check for path traversal attempts
    if (file.originalname.includes('../') || file.originalname.includes('..\\')) {
      return cb(new Error('Path traversal detected in filename'), false);
    }

    cb(null, true);
  } catch (error) {
    cb(new Error('File validation error: ' + error.message), false);
  }
};

// Create multer instance with security configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: FILE_SIZE_LIMITS.default,
    files: 10, // Maximum 10 files per request
    fieldNameSize: 100, // Limit field name size
    fieldSize: 1024 * 1024, // 1MB field size limit
    fields: 20 // Maximum 20 fields
  }
});

// Middleware factory functions
const createUploadMiddleware = {
  // Single file upload
  single: (fieldName, options = {}) => {
    const maxSize = options.maxSize || FILE_SIZE_LIMITS.default;
    const customUpload = multer({
      ...upload.options,
      limits: { ...upload.options.limits, fileSize: maxSize }
    });
    return customUpload.single(fieldName);
  },

  // Multiple files upload
  array: (fieldName, maxCount = 5, options = {}) => {
    const maxSize = options.maxSize || FILE_SIZE_LIMITS.default;
    const customUpload = multer({
      ...upload.options,
      limits: { ...upload.options.limits, fileSize: maxSize, files: maxCount }
    });
    return customUpload.array(fieldName, maxCount);
  },

  // Mixed fields upload
  fields: (fields, options = {}) => {
    const maxSize = options.maxSize || FILE_SIZE_LIMITS.default;
    const customUpload = multer({
      ...upload.options,
      limits: { ...upload.options.limits, fileSize: maxSize }
    });
    return customUpload.fields(fields);
  }
};

// Error handling middleware
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size allowed is ' + (FILE_SIZE_LIMITS.default / 1024 / 1024) + 'MB'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files. Maximum allowed is ' + upload.options.limits.files
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Unexpected field name in upload'
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'Upload error: ' + error.message
        });
    }
  } else if (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  next();
};

module.exports = {
  upload,
  createUploadMiddleware,
  handleUploadError,
  ALLOWED_FILE_TYPES,
  FILE_SIZE_LIMITS
};