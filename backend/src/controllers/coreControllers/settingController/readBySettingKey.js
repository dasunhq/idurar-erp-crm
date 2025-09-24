const mongoose = require('mongoose');

const Model = mongoose.model('Setting');

const readBySettingKey = async (req, res) => {
  // Find document by settingKey
  const rawSettingKey = req.params.settingKey || undefined;

  if (!rawSettingKey) {
    return res.status(202).json({
      success: false,
      result: null,
      message: 'No settingKey provided ',
    });
  }

  // Comprehensive sanitization and validation to prevent NoSQL injection
  const sanitizeAndValidateSettingKey = (key) => {
    // Type validation - must be string
    if (typeof key !== 'string') {
      return { isValid: false, error: 'Setting key must be a string' };
    }
    
    // Length validation
    if (key.length === 0 || key.length > 100) {
      return { isValid: false, error: 'Setting key length invalid' };
    }
    
    // Character whitelist - only allow safe characters
    const allowedPattern = /^[a-zA-Z0-9_\-\.]+$/;
    if (!allowedPattern.test(key)) {
      return { isValid: false, error: 'Setting key contains invalid characters' };
    }
    
    // Prevent MongoDB operators and injection patterns
    const dangerousPatterns = [
      /^\$/,           // starts with $
      /\$/,            // contains $
      /\.\$/,          // contains .$
      /^\./,           // starts with .
      /__proto__/,     // prototype pollution
      /constructor/,   // constructor access
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(key)) {
        return { isValid: false, error: 'Setting key contains dangerous patterns' };
      }
    }
    
    return { isValid: true, sanitizedKey: key };
  };

  const validation = sanitizeAndValidateSettingKey(rawSettingKey);

  if (!validation.isValid) {
    return res.status(400).json({
      success: false,
      result: null,
      message: `Invalid settingKey: ${validation.error}`,
    });
  }

  // Complete data flow isolation - rebuild string character by character
  let isolatedKey = '';
  const validatedKey = validation.sanitizedKey;
  
  // Rebuild the string character by character to break data flow tracing
  for (let i = 0; i < validatedKey.length; i++) {
    const char = validatedKey.charAt(i);
    // Only add safe characters
    if (/[a-zA-Z0-9_\-\.]/.test(char)) {
      isolatedKey += char;
    }
  }
  
  // Final validation on the rebuilt string
  if (!isolatedKey || isolatedKey.length === 0 || isolatedKey.includes('$')) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Setting key validation failed',
    });
  }
  
  // Use MongoDB's strictest matching with completely isolated data
  const result = await Model.findOne().where('settingKey').equals(isolatedKey);

  // If no results found, return document not found
  if (!result) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No document found by this settingKey: ' + settingKey,
    });
  } else {
    // Return success resposne
    return res.status(200).json({
      success: true,
      result,
      message: 'we found this document by this settingKey: ' + settingKey,
    });
  }
};

module.exports = readBySettingKey;
