const mongoose = require('mongoose');

const read = async (userModel, req, res) => {
  const User = mongoose.model(userModel);

  // Validate that user ID is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid user ID format',
    });
  }
  
  // Create a validated ObjectId from the ID parameter
  const objectId = new mongoose.Types.ObjectId(req.params.id);
  
  // Find document by id using the validated ObjectId
  const tmpResult = await User.findOne({
    _id: objectId,
    removed: false,
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
