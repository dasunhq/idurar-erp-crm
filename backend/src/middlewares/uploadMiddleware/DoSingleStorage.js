require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });

const path = require('path');
const { slugify } = require('transliteration');
const fileFilterMiddleware = require('./utils/fileFilterMiddleware');
const crypto = require('crypto');

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const secretAccessKey = process.env.DO_SPACES_SECRET;
const accessKeyId = process.env.DO_SPACES_KEY;
const endpoint = 'https://' + process.env.DO_SPACES_URL;
const region = process.env.REGION;

const clientParams = {
  endpoint: endpoint,
  region: region,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
};

const DoSingleStorage = ({
  entity,
  fileType = 'default',
  uploadFieldName = 'file',
  fieldName = 'file',
}) => {
  // Configure multer for secure file handling
  const storage = multer.memoryStorage();

  const fileFilter = (req, file, cb) => {
    // Validate file type using existing middleware
    if (!fileFilterMiddleware({ type: fileType, mimetype: file.mimetype })) {
      return cb(new Error('Uploaded file type not supported'), false);
    }

    // Additional security checks
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx'];
    const fileExtension = path.extname(file.originalname).toLowerCase();

    if (!allowedExtensions.includes(fileExtension)) {
      return cb(new Error('File extension not allowed'), false);
    }

    cb(null, true);
  };

  const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
      files: 1, // Only allow single file upload to prevent multiple files with same name
    },
  }).single(uploadFieldName);

  return async function (req, res, next) {
    upload(req, res, async function (err) {
      if (err) {
        return res.status(403).json({
          success: false,
          result: null,
          controller: 'DoSingleStorage.js',
          message: err.message || 'Error on uploading file',
        });
      }

      if (!req.file) {
        req.body[fieldName] = null;
        return next();
      }

      const s3Client = new S3Client(clientParams);

      try {
        if (!fileFilterMiddleware({ type: fileType, mimetype: req.files.file.mimetype })) {
          // skip upload if File type not supported
          throw new Error('Uploaded file type not supported');
          // next();
        }
        let fileExtension = path.extname(req.files.file.name);
        const fileNameWithoutExt = path.parse(req.files.file.name).name;

        // Generate a cryptographically secure random ID using the crypto module
        // This creates a Buffer with random bytes, converts to hex string, and takes first 5 characters
        let uniqueFileID = crypto.randomBytes(8).toString('hex').slice(0, 5);

        let originalname = '';
        if (req.body.seotitle) {
          originalname = slugify((typeof req.body.seotitle === 'string' ? req.body.seotitle : '').toLowerCase()); // convert any language to English characters
        } else {
          originalname = slugify(fileNameWithoutExt.toLowerCase()); // convert any language to English characters
        }

        let _fileName = `${originalname}-${uniqueFileID}${fileExtension}`;

        const filePath = `public/uploads/${entity}/${_fileName}`;

        let uploadParams = {
          Key: `${filePath}`,
          Bucket: process.env.DO_SPACES_NAME,
          ACL: 'public-read',
          Body: req.files.file.data,
        };
        const command = new PutObjectCommand(uploadParams);
        const s3response = await s3Client.send(command);

        if (s3response.$metadata.httpStatusCode === 200) {
          // saving file name and extension in request upload object
          req.upload = {
            fileName: _fileName,
            fieldExt: fileExtension,
            entity: entity,
            fieldName: fieldName,
            fileType: fileType,
            filePath: filePath,
          };

          req.body[fieldName] = filePath;
          next();
        }
      } catch (error) {
        return res.status(403).json({
          success: false,
          result: null,
          controller: 'DoSingleStorage.js',
          message: 'Error on uploading file',
        });
      }
    }
  };
};

module.exports = DoSingleStorage;