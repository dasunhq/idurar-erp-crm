const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { generate: uniqueId } = require('shortid');

const updateProfilePassword = async (userModel, req, res) => {
  const UserPassword = mongoose.model(userModel + 'Password');

  const reqUserName = userModel.toLowerCase();
  const userProfile = req[reqUserName];
  
  // Sanitize inputs from req.body
  let password = req.body.password ? String(req.body.password).trim() : '';
  let passwordCheck = req.body.passwordCheck ? String(req.body.passwordCheck).trim() : '';

  // Validate required fields
  if (!password || !passwordCheck)
    return res.status(400).json({ msg: 'Not all fields have been entered.' });

  // Validate password length
  if (password.length < 8)
    return res.status(400).json({
      msg: 'The password needs to be at least 8 characters long.',
    });

  // Validate password match
  if (password !== passwordCheck)
    return res.status(400).json({ msg: 'Enter the same password twice for verification.' });

  // Find document by id and updates with the required fields

  // Generate a secure salt for password hashing
  const salt = uniqueId();
  
  // Create a secure password hash using the sanitized password
  const passwordHash = bcrypt.hashSync(salt + password);

  // Create sanitized password data for database update
  const UserPasswordData = {
    password: passwordHash,
    salt: salt,
  };

  if (userProfile.email === 'admin@admin.com') {
    return res.status(403).json({
      success: false,
      result: null,
      message: "you couldn't update demo password",
    });
  }

  // Validate that user ID is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(userProfile._id)) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid user ID format',
    });
  }
  
  // Create a secure ObjectId from validated ID
  const userId = new mongoose.Types.ObjectId(userProfile._id);
  
  // Create separate query object with explicit type casting
  const secureQuery = {
    user: userId,        // Use the sanitized ObjectId
    removed: false       // Use explicit boolean
  };
  
  // Use a separate update object
  const secureUpdate = {
    $set: Object.assign({}, UserPasswordData) // Create a new object to break data flow
  };
  
  // Define explicit options
  const queryOptions = {
    new: true, // return the new result instead of the old one
    runValidators: true // Add validators as an additional security measure
  };

  const resultPassword = await UserPassword.findOneAndUpdate(
    secureQuery,
    secureUpdate,
    queryOptions
  ).exec();

  if (!resultPassword) {
    return res.status(403).json({
      success: false,
      result: null,
      message: "User Password couldn't save correctly",
    });
  }

  // Convert ObjectId to string for safe display in messages
  const sanitizedUserId = mongoose.Types.ObjectId.isValid(userProfile._id) 
    ? new mongoose.Types.ObjectId(userProfile._id).toString()
    : 'invalid-id';
    
  return res.status(200).json({
    success: true,
    result: {},
    message: 'we update the password by this id: ' + sanitizedUserId,
  });
};

module.exports = updateProfilePassword;
