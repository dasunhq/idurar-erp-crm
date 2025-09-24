const mongoose = require('mongoose');

const read = async (userModel, req, res) => {
  const User = mongoose.model(userModel);

  // Validate and sanitize the ID parameter
  const rawId = req.params.id;
  
  // Input validation and sanitization
  if (!rawId || typeof rawId !== 'string') {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid ID parameter',
    });
  }

  // Validate ObjectId format and prevent NoSQL injection
  let validatedId;
  try {
    validatedId = new mongoose.Types.ObjectId(rawId.toString());
  } catch (error) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid ID format',
    });
  }

  // Find document by id with secure query using $eq operator
  const tmpResult = await User.findOne({
    _id: { $eq: validatedId },
    removed: { $eq: false },
  }).exec();
  // If no results found, return document not found
  if (!tmpResult) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No document found ',
    });
  } else {
    // Return success resposne
    let result = {
      _id: tmpResult._id,
      enabled: tmpResult.enabled,
      email: tmpResult.email,
      name: tmpResult.name,
      surname: tmpResult.surname,
      photo: tmpResult.photo,
      role: tmpResult.role,
    };

    return res.status(200).json({
      success: true,
      result,
      message: 'we found this document ',
    });
  }
};

module.exports = read;
