const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const adminSchema = new Schema({
  removed: {
    type: Boolean,
    default: false,
  },
  enabled: {
    type: Boolean,
    default: false,
  },

  email: {
    type: String,
    lowercase: true,
    trim: true,
    required: true,
  },
  name: { type: String, required: true },
  surname: { type: String },
  photo: {
    type: String,
    trim: true,
  },
  created: {
    type: Date,
    default: Date.now,
  },
  role: {
    type: String,
    default: 'owner',
    enum: ['owner'],
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  facebookId: {
    type: String,
    unique: true,
    sparse: true,
  },
  // OAuth tokens storage
  oauthTokens: {
    google: {
      accessToken: String,
      refreshToken: String,
      expiresAt: Date,
    },
    facebook: {
      accessToken: String,
      refreshToken: String,
      expiresAt: Date,
    }
  },
  // Last OAuth token refresh
  lastTokenRefresh: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('Admin', adminSchema);
