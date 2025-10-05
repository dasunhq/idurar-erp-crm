const express = require('express');
const router = express.Router();

const path = require('path');
const { isPathInside } = require('../../utils/is-path-inside');
const { publicLimiter } = require('../../middlewares/rateLimiter');

router.route('/:subPath/:directory/:file').get(publicLimiter, function (req, res) {
  try {
    const { subPath, directory, file } = req.params;

    // Validate input parameters - Reject any input containing path traversal sequences
    if ([subPath, directory, file].some(param => 
      param.includes('../') || param.includes('..\\') || 
      param.includes('/..') || param.includes('\\..') || 
      param === '..'
    )) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filepath - path traversal detected',
      });
    }

    // Only allow alphanumeric characters, dashes, underscores, dots for filenames
    const safePathRegex = /^[a-zA-Z0-9_\-\.]+$/;
    if ([subPath, directory, file].some(param => !safePathRegex.test(param))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filepath - contains forbidden characters',
      });
    }

    // Define the trusted root directory
    const rootDir = path.resolve(path.join(__dirname, '../../public'));

    // Safely join the path segments (after validation)
    const relativePath = path.join(subPath, directory, file);
    const absolutePath = path.resolve(path.join(rootDir, relativePath));

    // Double-check that the resulting path stays inside rootDir
    if (!isPathInside(absolutePath, rootDir) || !absolutePath.startsWith(rootDir)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid filepath - access denied',
      });
    }

    // Use the normalized and validated path
    return res.sendFile(absolutePath, (error) => {
      if (error) {
        return res.status(404).json({
          success: false,
          result: null,
          message: 'we could not find : ' + file,
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
