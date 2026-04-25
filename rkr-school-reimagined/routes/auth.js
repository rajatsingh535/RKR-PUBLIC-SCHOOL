const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

// POST /api/auth/register → creates account, redirects to /status
router.post('/register', register);

// POST /api/auth/login → validates credentials, redirects based on role
router.post('/login', login);

module.exports = router;
