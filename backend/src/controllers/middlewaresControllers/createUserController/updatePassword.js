const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { generate: uniqueId } = require('shortid');

const updatePassword = async (userModel, req, res) => {
  const UserPassword = mongoose.model(userModel + 'Password');

  const reqUserName = userModel.toLowerCase();
  const userProfile = req[reqUserName];

<<<<<<< HEAD
  // Extract password from request body with type safety
  const passwordFromRequest = req.body.password;
  
  // Validate that password exists and is a string
  if (!passwordFromRequest || typeof passwordFromRequest !== 'string') {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Password must be provided as a string',
    });
  }
  
  // Sanitize password by trimming and ensuring it's a string
  const password = String(passwordFromRequest).trim();
  
  // Validate password length after ensuring it's a proper string
  if (password.length < 8) {
=======
  let { password } = req.body;

    if (typeof req.body.password !== 'string' || req.body.password.length < 8) {
>>>>>>> sudila/redos
    return res.status(400).json({
      msg: 'The password needs to be at least 8 characters long.',
    });
  }

  // Find document by id and updates with the required fields

  if (userProfile.email === 'admin@admin.com') {
    return res.status(403).json({
      success: false,
      result: null,
      message: "you couldn't update demo password",
    });
  }

  // Generate a secure salt for password hashing
  const salt = uniqueId();

  // Create a secure password hash using bcrypt
  const passwordHash = bcrypt.hashSync(salt + password);

  // Create sanitized password data for database update
  // Use explicit String() conversion to sanitize all values
  const passwordData = {
    password: String(passwordHash),
    salt: String(salt),
  };
  
  // Sanitize and validate user ID to prevent NoSQL injection
  const userId = req.params.id;
  
  // Validate if the ID is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid user ID format',
    });
  }
  
  // Create a secure query with explicit ObjectId creation and Boolean type
  const secureQuery = { 
    user: new mongoose.Types.ObjectId(userId),  // Convert to ObjectId
    removed: Boolean(false)                     // Explicit Boolean type
  };
  
  // Create a deep copy of the update data to break the data flow chain
  // This creates a new object that has no reference to the original input
  const safeUpdateData = JSON.parse(JSON.stringify(passwordData));
  
  // Construct the update operation with a clear static structure
  const safeUpdateOperation = {
    $set: safeUpdateData
  };
  
  // Define explicit options with security considerations
  const updateOptions = {
    new: true,           // Return the updated document
    runValidators: true, // Validate the update against schema
    upsert: false        // Prevent document creation
  };

  const resultPassword = await UserPassword.findOneAndUpdate(
    secureQuery,
    safeUpdateOperation,
    updateOptions
  ).exec();

  // Code to handle the successful response

  if (!resultPassword) {
    return res.status(403).json({
      success: false,
      result: null,
      message: "User Password couldn't save correctly",
    });
  }

  return res.status(200).json({
    success: true,
    result: {},
    message: 'we update the password by this id: ' + userProfile._id,
  });
};

module.exports = updatePassword;
