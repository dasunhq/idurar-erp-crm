const mongoose = require('mongoose');

const logout = async (req, res, { userModel }) => {
  const UserPassword = mongoose.model(userModel + 'Password');

  // Validate user ID is a proper ObjectId to prevent injection
  if (!req.admin || !req.admin._id || !mongoose.Types.ObjectId.isValid(req.admin._id)) {
    return res.status(401).json({
      success: false,
      result: null,
      message: 'Invalid user authentication',
    });
  }

  const validatedUserId = new mongoose.Types.ObjectId(req.admin._id);

  // const token = req.cookies[`token_${cloud._id}`];

  const authHeader = req.headers['authorization'];
  const rawToken = authHeader && authHeader.split(' ')[1]; // Extract the token

  // Sanitize and validate token to prevent NoSQL injection
  const sanitizeToken = (token) => {
    // Ensure token is a string and not an object
    if (typeof token !== 'string') {
      return null;
    }

    // Basic length validation for JWT tokens (typically 100-500+ chars)
    if (token.length < 10 || token.length > 2000) {
      return null;
    }

    // Allow only characters typical in JWT tokens (base64url + dots)
    const allowedPattern = /^[A-Za-z0-9\-_\.]+$/;
    if (!allowedPattern.test(token)) {
      return null;
    }

    // Prevent MongoDB operators and injection patterns
    if (token.startsWith('$') || token.includes('$') || token.startsWith('.') || token.includes('..')) {
      return null;
    }

    return token;
  };

  const sanitizedToken = rawToken ? sanitizeToken(rawToken) : null;

  if (sanitizedToken) {
    // Use secure query with validated inputs
    await UserPassword.findOneAndUpdate(
      { user: { $eq: validatedUserId } },
      { $pull: { loggedSessions: { $eq: sanitizedToken } } },
      {
        new: true,
      }
    ).exec();
  } else {
    // Clear all sessions if no valid token
    await UserPassword.findOneAndUpdate(
      { user: { $eq: validatedUserId } },
      { $set: { loggedSessions: [] } },
      {
        new: true,
      }
    ).exec();
  }

  return res.json({
    success: true,
    result: {},
    message: 'Successfully logout',
  });
};

module.exports = logout;
