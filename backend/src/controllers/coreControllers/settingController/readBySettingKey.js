const mongoose = require('mongoose');

const Model = mongoose.model('Setting');

const readBySettingKey = async (req, res) => {
  // Find document by id
  const settingKey = req.params.settingKey || undefined;

  if (!settingKey) {
    return res.status(202).json({
      success: false,
      result: null,
      message: 'No settingKey provided ',
    });
  }
  
  // Validate settingKey format - only allow alphanumeric characters, underscores, and hyphens
  const keyRegex = /^[a-zA-Z0-9_\-\.]+$/;
  if (!keyRegex.test(settingKey)) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid settingKey format',
    });
  }
  
  // Use the validated and sanitized key for the query
  const sanitizedSettingKey = settingKey;
  
  const result = await Model.findOne({
    settingKey: sanitizedSettingKey,
  });

  // If no results found, return document not found
  if (!result) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No document found by this settingKey: ' + sanitizedSettingKey,
    });
  } else {
    // Return success resposne
    return res.status(200).json({
      success: true,
      result,
      message: 'we found this document by this settingKey: ' + sanitizedSettingKey,
    });
  }
};

module.exports = readBySettingKey;
