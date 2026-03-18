const express = require('express');
const router = express.Router();
const {
  registerClient,
  loginClient,
  registerSir,
  loginSir,
  getMe,
} = require('../controller/authController');
const { protect } = require('../middleware/authMiddleware');

// Client routes
router.post('/client/register', registerClient);
router.post('/client/login', loginClient);

// Sir routes
router.post('/sir/register', registerSir);   
router.post('/sir/login', loginSir);

// Get logged-in user profile
router.get('/me', protect, getMe);

module.exports = router;
