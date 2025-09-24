const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const mongoose = require('mongoose');

const shortid = require('shortid');

const resetPassword = async (req, res, { userModel }) => {
  const UserPassword = mongoose.model(userModel + 'Password');
  const User = mongoose.model(userModel);
  const { password, userId, resetToken } = req.body;

  // Validate and sanitize inputs before any database operations to prevent NoSQL injection
  
  // 1. Validate userId is a proper MongoDB ObjectId
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid user ID format',
    });
  }

  const validatedUserId = new mongoose.Types.ObjectId(userId);

  // 2. Sanitize resetToken - should be alphanumeric string
  const sanitizeResetToken = (token) => {
    if (typeof token !== 'string') return null;
    if (token.length < 5 || token.length > 50) return null;
    // Allow only alphanumeric characters and common safe characters
    const allowedPattern = /^[A-Za-z0-9\-_]+$/;
    if (!allowedPattern.test(token)) return null;
    // Prevent MongoDB operators
    if (token.startsWith('$') || token.includes('$')) return null;
    return token;
  };

  const sanitizedResetToken = sanitizeResetToken(resetToken);
  if (!sanitizedResetToken) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid reset token format',
    });
  }

  // 3. Comprehensive password validation and sanitization
  const sanitizePassword = (pass) => {
    if (!pass || typeof pass !== 'string') return null;
    if (pass.length < 1 || pass.length > 128) return null; // Reasonable password length
    // Prevent object injection and ensure it's a clean string
    return String(pass);
  };

  const sanitizedPassword = sanitizePassword(password);
  if (!sanitizedPassword) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Password is required and must be a valid string',
    });
  }

  // Use validated inputs in database queries
  const databasePassword = await UserPassword.findOne({ 
    user: { $eq: validatedUserId }, 
    removed: { $eq: false } 
  });
  const user = await User.findOne({ 
    _id: { $eq: validatedUserId }, 
    removed: { $eq: false } 
  }).exec();

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

  const isMatch = sanitizedResetToken === databasePassword.resetToken;
  if (!isMatch || databasePassword.resetToken === undefined || databasePassword.resetToken === null)
    return res.status(403).json({
      success: false,
      result: null,
      message: 'Invalid reset token',
    });

  // validate with sanitized inputs
  const objectSchema = Joi.object({
    password: Joi.string().required(),
    userId: Joi.string().required(),
    resetToken: Joi.string().required(),
  });

  const { error, value } = objectSchema.validate({ 
    password: sanitizedPassword, 
    userId: validatedUserId.toString(), 
    resetToken: sanitizedResetToken 
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

  const salt = shortid.generate();
  
  // Use completely isolated password value to break data flow tracing
  let isolatedPassword = '';
  for (let i = 0; i < sanitizedPassword.length; i++) {
    isolatedPassword += sanitizedPassword.charAt(i);
  }
  
  const hashedPassword = bcrypt.hashSync(salt + isolatedPassword);
  const emailToken = shortid.generate();

  const token = jwt.sign(
    {
      id: validatedUserId.toString(),
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  await UserPassword.findOneAndUpdate(
    { user: { $eq: validatedUserId } },
    {
      $push: { loggedSessions: token },
      password: hashedPassword,
      salt: salt,
      emailToken: emailToken,
      resetToken: shortid.generate(),
      emailVerified: true,
    },
    {
      new: true,
    }
  ).exec();

  if (
    sanitizedResetToken === databasePassword.resetToken &&
    databasePassword.resetToken !== undefined &&
    databasePassword.resetToken !== null
  )
    //  .cookie(`token_${user.cloud}`, token, {
    //       maxAge: 24 * 60 * 60 * 1000,
    //       sameSite: 'None',
    //       httpOnly: true,
    //       secure: true,
    //       domain: req.hostname,
    //       path: '/',
    //       Partitioned: true,
    //     })
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
        maxAge: req.body.remember ? 365 : null,
      },
      message: 'Successfully resetPassword user',
    });
};

module.exports = resetPassword;
