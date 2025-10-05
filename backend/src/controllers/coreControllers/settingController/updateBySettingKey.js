const mongoose = require('mongoose');

const Model = mongoose.model('Setting');

const updateBySettingKey = async (req, res) => {
  // Sanitize settingKey input to prevent NoSQL injection
  const settingKeyParam = req.params.settingKey || undefined;

  if (!settingKeyParam) {
    return res.status(202).json({
      success: false,
      result: null,
      message: 'No settingKey provided ',
    });
  }
  
  // Strictly sanitize settingKey to ensure it's a string
  const settingKey = String(settingKeyParam).trim();
  
  // Extract and sanitize settingValue
  const { settingValue: rawSettingValue } = req.body;

  if (!rawSettingValue) {
    return res.status(202).json({
      success: false,
      result: null,
      message: 'No settingValue provided ',
    });
  }
  
  // Create a safe sanitized value based on the input
  let sanitizedValue = typeof rawSettingValue === 'string' 
    ? String(rawSettingValue) 
    : JSON.stringify(rawSettingValue);
  
  // Create a query object with explicit type casting to prevent NoSQL injection
  const queryFilter = { settingKey: String(settingKey) };
  
  // Create update object with sanitized value
  const updateObj = {
    settingValue: sanitizedValue,
  };
  
  const result = await Model.findOneAndUpdate(
    queryFilter,
    updateObj,
    {
      new: true, // return the new result instead of the old one
      runValidators: true,
    }
  ).exec();
  if (!result) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No document found by this settingKey: ' + settingKey,
    });
  } else {
    return res.status(200).json({
      success: true,
      result,
      message: 'we update this document by this settingKey: ' + settingKey,
    });
  }
};

module.exports = updateBySettingKey;
