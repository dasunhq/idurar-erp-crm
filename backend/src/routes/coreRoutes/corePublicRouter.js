const express = require('express');
const router = express.Router();

const path = require('path');
const { isPathInside } = require('../../utils/is-path-inside');

router.route('/:subPath/:directory/:file').get(function (req, res) {
  try {
    const { subPath, directory, file } = req.params;

    // Sanitize and validate path parameters
    const sanitizePath = (segment) => {
      if (!segment || typeof segment !== 'string') return '';
      // Remove any directory traversal sequences and normalize
      return segment.replace(/\.{2,}/g, '')        // Remove double dots
                   .replace(/\/+/g, '')            // Remove forward slashes
                   .replace(/\\+/g, '')            // Remove backslashes
                   .replace(/[^a-zA-Z0-9-_\.]/g, ''); // Only allow safe chars
    };

    // Sanitize each decoded parameter
    const cleanSubPath = sanitizePath(decodeURIComponent(subPath));
    const cleanDirectory = sanitizePath(decodeURIComponent(directory));
    const cleanFile = sanitizePath(decodeURIComponent(file));

    // Reject empty or invalid paths
    if (!cleanSubPath || !cleanDirectory || !cleanFile) {
      return res.status(400).json({
        success: false,
        error: 'Invalid file path parameters',
      });
    }

    // Define the trusted root directory
    const rootDir = path.resolve(path.join(__dirname, '../../public'));

    // Safely join the sanitized path segments
    const relativePath = path.join(cleanSubPath, cleanDirectory, cleanFile);
    const absolutePath = path.resolve(path.join(rootDir, relativePath));

    // Check if the resulting path stays inside rootDir
    if (!isPathInside(absolutePath, rootDir)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filepath',
      });
    }

    return res.sendFile(absolutePath, (error) => {
      if (error) {
        return res.status(404).json({
          success: false,
          result: null,
          message: 'File not found', // Generic error for security
        });
      }
    });
  } catch (error) {
    return res.status(503).json({
      success: false,
      result: null,
      message: error.message,
      error: error,
    });
  }
});

module.exports = router;
