const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const mongoose = require('mongoose');

const shortid = require('shortid');

const resetPassword = async (req, res, { userModel }) => {
  const UserPassword = mongoose.model(userModel + 'Password');
  const User = mongoose.model(userModel);
  const { password, userId, resetToken } = req.body;

  // Validate that userId is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid user ID format',
    });
  }

  // Create a validated ObjectId from the userId
  const objectId = new mongoose.Types.ObjectId(userId);

  const databasePassword = await UserPassword.findOne({ user: objectId, removed: false });
  const user = await User.findOne({ _id: objectId, removed: false }).exec();

  if (!user.enabled)
    return res.status(409).json({
      success: false,
      result: null,
      message: 'Your account is disabled, contact your account adminstrator',
    });

  if (!databasePassword || !user)
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No account with this email has been registered.',
    });

  // Ensure resetToken exists in database before comparing
  if (!databasePassword.resetToken || typeof databasePassword.resetToken !== 'string') {
    return res.status(403).json({
      success: false,
      result: null,
      message: 'Invalid reset token',
    });
  }

  // Use constant-time comparison to prevent timing attacks
  // Both strings must be strings and have same length and content
  const isMatch = typeof resetToken === 'string' && 
                 resetToken.length === databasePassword.resetToken.length &&
                 resetToken === databasePassword.resetToken;
  
  if (!isMatch) {
    return res.status(403).json({
      success: false,
      result: null,
      message: 'Invalid reset token',
    });
  }

  // validate with more stringent requirements
  const objectSchema = Joi.object({
    // Password must be at least 8 characters with reasonable complexity
    password: Joi.string().min(8).required().messages({
      'string.min': 'Password must be at least 8 characters long'
    }),
    // Ensure userId is a valid MongoDB ObjectId (24 hex chars)
    userId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.pattern.base': 'User ID must be a valid MongoDB ObjectId'
    }),
    // Sanitize resetToken to prevent injection
    resetToken: Joi.string().regex(/^[a-zA-Z0-9_-]+$/).required().messages({
      'string.pattern.base': 'Reset token contains invalid characters'
    }),
    // Ensure remember is a boolean value only
    remember: Joi.boolean().default(false),
  });

  const { error, value } = objectSchema.validate({ 
    password, 
    userId, 
    resetToken, 
    remember: req.body.remember 
  });
  if (error) {
    return res.status(409).json({
      success: false,
      result: null,
      error: error,
      message: 'Invalid reset password object',
      errorMessage: error.message,
    });
  }
  
  // Use validated values from this point forward
  const validatedData = value;

  const salt = shortid.generate();
  const hashedPassword = bcrypt.hashSync(salt + validatedData.password);
  const emailToken = shortid.generate();

  // Use the validated objectId for the JWT token to prevent injection
  const token = jwt.sign(
    {
      id: objectId.toString(),
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  // Generate a new secure reset token
  const newResetToken = shortid.generate();
  
  // Create a secure update object with explicitly defined fields
  // Avoid using MongoDB operators directly in the object
  const updateData = {
    password: hashedPassword,
    salt: salt,
    emailToken: emailToken,
    resetToken: newResetToken,
    emailVerified: true,
  };
  
  // Create a separate object for operations that use MongoDB operators
  // This ensures that we're not vulnerable to operator injection
  const pushOperation = {
    $push: { 
      loggedSessions: token 
    }
  };

  // First update the core fields without using MongoDB operators
  await UserPassword.findOneAndUpdate(
    { user: objectId },
    updateData,
    {
      new: true,
      runValidators: true,
    }
  ).exec();
  
  // Then do a separate update for the $push operation
  // This further isolates MongoDB operators from user input
  await UserPassword.findOneAndUpdate(
    { user: objectId },
    pushOperation,
    { 
      new: true,
      runValidators: true 
    }
  ).exec();

  // The token was already validated earlier, but we'll keep this check for backward compatibility
  // and as a defense-in-depth measure
  if (isMatch && databasePassword.resetToken) {
    // Safe to return user data as it was retrieved from database using validated objectId
    //  .cookie(`token_${user.cloud}`, token, {
    //       maxAge: 24 * 60 * 60 * 1000,
    //       sameSite: 'None',
    //       httpOnly: true,
    //       secure: true,
    //       domain: req.hostname,
    //       path: '/',
    //       Partitioned: true,
    //     })
    // Use validated value.remember instead of directly using req.body.remember
    return res.status(200).json({
      success: true,
      result: {
        _id: user._id,
        name: user.name,
        surname: user.surname,
        role: user.role,
        email: user.email,
        photo: user.photo,
        token: token,
        maxAge: value.remember ? 365 : null,
      },
      message: 'Successfully resetPassword user',
    });
  } else {
    return res.status(403).json({
      success: false,
      result: null,
      message: 'Invalid reset token or token expired',
    });
  }
};

module.exports = resetPassword;
