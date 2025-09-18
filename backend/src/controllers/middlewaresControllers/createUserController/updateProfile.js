const mongoose = require('mongoose');
const Joi = require('joi');

const updateProfile = async (userModel, req, res) => {
  const User = mongoose.model(userModel);

  const reqUserName = userModel.toLowerCase();
  const userProfile = req[reqUserName];

  // Validate that userId is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(userProfile._id)) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid user ID format',
    });
  }

  // Create a validated ObjectId from the userId
  const objectId = new mongoose.Types.ObjectId(userProfile._id);

  // Validate input data
  const schema = Joi.object({
    email: Joi.string().email().required(),
    name: Joi.string().required(),
    surname: Joi.string().required(),
    photo: Joi.string().allow(null, ''),
  });

  // Extract only the fields we want to update
  const dataToValidate = {
    email: req.body.email,
    name: req.body.name,
    surname: req.body.surname,
    photo: req.body.photo,
  };

  const { error, value } = schema.validate(dataToValidate);
  
  if (error) {
    return res.status(400).json({
      success: false,
      result: null,
      message: `Validation error: ${error.details.map(x => x.message).join(', ')}`,
    });
  }
  
  // Use validated data from this point forward
  const validatedData = value;
  
  if (userProfile.email === 'admin@admin.com') {
    return res.status(403).json({
      success: false,
      result: null,
      message: "you couldn't update demo informations",
    });
  }

  // Create a sanitized updates object using the validated data
  let updates = {};
  
  // Only include fields that have values
  if (validatedData.email) updates.email = validatedData.email;
  if (validatedData.name) updates.name = validatedData.name;
  if (validatedData.surname) updates.surname = validatedData.surname;
  
  // Only include photo if it exists and is not empty
  if (validatedData.photo) updates.photo = validatedData.photo;
  // Find document by id and updates with the required fields
  // Using validated objectId and sanitized updates object
  const result = await User.findOneAndUpdate(
    { _id: objectId, removed: false },
    { $set: updates },
    {
      new: true, // return the new result instead of the old one
      runValidators: true, // run validators to ensure data meets schema requirements
    }
  ).exec();

  if (!result) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No profile found by this id: ' + objectId,
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
    message: 'we update this profile by this id: ' + objectId,
  });
};

module.exports = updateProfile;
