const mongoose = require('mongoose');

const logout = async (req, res, { userModel }) => {
  const UserPassword = mongoose.model(userModel + 'Password');

  // Validate that user ID is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(req.admin._id)) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid user ID format',
    });
  }
  
  // Create a validated ObjectId from the user ID
  const objectId = new mongoose.Types.ObjectId(req.admin._id);

  try {
    // Check if the user exists in the database
    const userExists = await UserPassword.exists({ user: objectId });
    if (!userExists) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'User not found',
      });
    }

    // Extract and validate token from Authorization header
    const authHeader = req.headers['authorization'];
    let token = null;
    
    // Validate authorization header format and extract token
    if (authHeader && authHeader.startsWith('Bearer ') && authHeader.split(' ').length === 2) {
      const rawToken = authHeader.split(' ')[1].trim(); // Extract and trim the token
      
      // Strict validation for JWT token format (assumes JWT tokens with reasonable structure)
      // JWT tokens typically have 3 parts separated by dots and contain only base64url characters
      if (rawToken && 
          typeof rawToken === 'string' && 
          rawToken.length <= 1000 && 
          /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(rawToken)) {
        token = rawToken;
      }
    }
    if (token) {
      // Use update operation with query completely separated from user input
      // This approach provides defense-in-depth against injection
      const query = { user: objectId };
      const update = { $pull: { loggedSessions: token } };
      const options = { new: true, runValidators: true };
      
      await UserPassword.findOneAndUpdate(query, update, options).exec();
    }
    else {
      // Clear all logged sessions
      const query = { user: objectId };
      const update = { $set: { loggedSessions: [] } }; // Using explicit $set operator
      const options = { new: true, runValidators: true };
      
      await UserPassword.findOneAndUpdate(query, update, options).exec();
    }

    return res.json({
      success: true,
      result: {},
      message: 'Successfully logged out',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error during logout process',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

module.exports = logout;
