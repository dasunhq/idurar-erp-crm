const express = require('express');

const router = express.Router();

const { catchErrors } = require('@/handlers/errorHandlers');
const adminAuth = require('@/controllers/coreControllers/adminAuth');
const setup = require('@/controllers/coreControllers/setup');
const { setupRateLimiter } = require('@/middlewares/rateLimiter');

router.route('/login').post(catchErrors(adminAuth.login));

router.route('/setup').post(setupRateLimiter, catchErrors(setup));

router.route('/forgetpassword').post(catchErrors(adminAuth.forgetPassword));
router.route('/resetpassword').post(catchErrors(adminAuth.resetPassword));

router.route('/logout').post(adminAuth.isValidAuthToken, catchErrors(adminAuth.logout));

module.exports = router;
