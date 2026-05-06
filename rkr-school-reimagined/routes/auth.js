const express = require('express');
const router = express.Router();
const { register, login, forgotPassword, resetPassword } = require('../controllers/authController');

// POST /api/auth/register → creates account, redirects to /status
router.post('/register', register);

// POST /api/auth/login → validates credentials, redirects based on role
router.post('/login', login);

// POST /api/auth/forgot-password → sends a password reset email
router.post('/forgot-password', forgotPassword);

// POST /api/auth/reset-password → updates password from reset link
router.post('/reset-password', resetPassword);

module.exports = router;
