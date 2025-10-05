const express = require('express');

const router = express.Router();

const { catchErrors } = require('@/handlers/errorHandlers');
const adminAuth = require('@/controllers/coreControllers/adminAuth');

router.route('/login').post(catchErrors(adminAuth.login));

router.route('/forgetpassword').post(catchErrors(adminAuth.forgetPassword));
router.route('/resetpassword').post(catchErrors(adminAuth.resetPassword));

router.route('/logout').post(adminAuth.isValidAuthToken, catchErrors(adminAuth.logout));

// CSRF Token endpoint
router.route('/csrf-token').get((req, res) => {
  try {
    res.json({ 
      success: true,
      csrfToken: req.csrfToken() 
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating CSRF token',
      error: error.message
    });
  }
});

module.exports = router;
