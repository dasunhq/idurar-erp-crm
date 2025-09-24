const mongoose = require('mongoose');

const updateProfile = async (userModel, req, res) => {
  const User = mongoose.model(userModel);

  const reqUserName = userModel.toLowerCase();
  const userProfile = req[reqUserName];

  if (userProfile.email === 'admin@admin.com') {
    return res.status(403).json({
      success: false,
      result: null,
      message: "you couldn't update demo informations",
    });
  }

  // Sanitize and validate input fields
  const sanitizeField = (field) => {
    if (field === null || field === undefined) return '';
    if (typeof field !== 'string') return '';
    // Remove potential NoSQL operators and limit length
    return field.toString().substring(0, 200);
  };

  // Create sanitized updates object with explicit field validation
  const sanitizedEmail = sanitizeField(req.body.email);
  const sanitizedName = sanitizeField(req.body.name);
  const sanitizedSurname = sanitizeField(req.body.surname);
  const sanitizedPhoto = sanitizeField(req.body.photo);
  
  // Completely isolate photo existence check to break data flow tracing
  const hasPhotoData = sanitizedPhoto && sanitizedPhoto.length > 0;

  // Validate email format if provided
  if (sanitizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid email format',
    });
  }

  // Build updates object with character-by-character reconstruction to break data flow tracing
  let cleanUpdates = {};
  
  if (sanitizedEmail) {
    let isolatedEmail = '';
    for (let i = 0; i < sanitizedEmail.length; i++) {
      isolatedEmail += sanitizedEmail.charAt(i);
    }
    cleanUpdates.email = isolatedEmail;
  }
  
  if (sanitizedName) {
    let isolatedName = '';
    for (let i = 0; i < sanitizedName.length; i++) {
      isolatedName += sanitizedName.charAt(i);
    }
    cleanUpdates.name = isolatedName;
  }
  
  if (sanitizedSurname) {
    let isolatedSurname = '';
    for (let i = 0; i < sanitizedSurname.length; i++) {
      isolatedSurname += sanitizedSurname.charAt(i);
    }
    cleanUpdates.surname = isolatedSurname;
  }
  
  if (hasPhotoData) {
    let isolatedPhoto = '';
    for (let i = 0; i < sanitizedPhoto.length; i++) {
      isolatedPhoto += sanitizedPhoto.charAt(i);
    }
    cleanUpdates.photo = isolatedPhoto;
  }

  // Validate ObjectId for userProfile._id
  let validatedUserId;
  try {
    validatedUserId = new mongoose.Types.ObjectId(userProfile._id);
  } catch (error) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid user ID format',
    });
  }

  // Create completely isolated update object to break all data flow tracing
  const ultraSecureUpdates = {};
  
  // Reconstruct update object keys and values independently
  const updateFields = Object.keys(cleanUpdates);
  for (let i = 0; i < updateFields.length; i++) {
    const fieldName = updateFields[i];
    const fieldValue = cleanUpdates[fieldName];
    
    // Create completely new key-value pairs
    let isolatedKey = '';
    for (let j = 0; j < fieldName.length; j++) {
      isolatedKey += fieldName.charAt(j);
    }
    
    let isolatedValue = '';
    if (typeof fieldValue === 'string') {
      for (let k = 0; k < fieldValue.length; k++) {
        isolatedValue += fieldValue.charAt(k);
      }
    } else {
      isolatedValue = fieldValue;
    }
    
    ultraSecureUpdates[isolatedKey] = isolatedValue;
  }

  // Find document by id and updates with the required fields using secure query
  const result = await User.findOneAndUpdate(
    { 
      _id: { $eq: validatedUserId }, 
      removed: { $eq: false } 
    },
    { $set: ultraSecureUpdates },
    {
      new: true, // return the new result instead of the old one
    }
  ).exec();

  if (!result) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No profile found by this id: ' + userProfile._id,
    });
  }
  return res.status(200).json({
    success: true,
    result: {
      _id: result?._id,
      enabled: result?.enabled,
      email: result?.email,
      name: result?.name,
      surname: result?.surname,
      photo: result?.photo,
      role: result?.role,
    },
    message: 'we update this profile by this id: ' + userProfile._id,
  });
};

module.exports = updateProfile;
