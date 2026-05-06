const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { sendPasswordResetEmail } = require('../config/email');

// ─── Fixed credentials (not in DB) ────────────────────────────────────────────
const FIXED_ADMIN = {
  email: 'admin@rkrschool.com',
  password: 'admin123',
  name: 'Administrator',
  role: 'admin'
};

const JWT_SECRET = process.env.JWT_SECRET || 'rkr-school-secret-key-2026';

const FIXED_STUDENT = {
  email: 'student@rkrschool.com',
  password: 'student123',
  name: 'Student User',
  role: 'student'
};

// Helper: create JWT and set cookie
const setTokenCookie = (res, payload) => {
  try {
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
    res.cookie('token', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
    return token;
  } catch (err) {
    console.error('JWT Sign Error:', err);
    return null;
  }
};

// ─── REGISTER (POST /api/auth/register) ────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.render('register', { user: null, error: 'An account with that email already exists.' });
    }

    // Always register as student (admin is fixed only)
    const user = new User({ name, email, password, role: 'student' });
    await user.save();

    const token = setTokenCookie(res, { id: user._id, role: user.role, name: user.name, email: user.email });
    if (!token) throw new Error('Failed to generate authentication token');

    return res.status(201).json({ 
      success: true, 
      message: 'Registration successful!', 
      role: user.role,
      user: { name: user.name, email: user.email }
    });

  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, message: 'Registration failed. ' + err.message });
  }
};

// ─── LOGIN (POST /api/auth/login) ──────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const emailLower = email.toLowerCase().trim();

    // 1. Check fixed admin
    if (emailLower === FIXED_ADMIN.email && password === FIXED_ADMIN.password) {
      setTokenCookie(res, { id: 'admin_fixed', role: 'admin', name: FIXED_ADMIN.name });
      return res.json({ success: true, message: 'Welcome back, Admin!', role: 'admin' });
    }

    // 2. Check fixed student
    if (emailLower === FIXED_STUDENT.email && password === FIXED_STUDENT.password) {
      setTokenCookie(res, { id: 'student_fixed', role: 'student', name: FIXED_STUDENT.name, email: FIXED_STUDENT.email });
      return res.json({ success: true, message: 'Welcome back!', role: 'student' });
    }

    // 3. Check database user
    const user = await User.findOne({ email: emailLower });
    if (!user) {
      return res.status(401).json({ success: false, message: 'No account found with that email.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password.' });
    }

    setTokenCookie(res, { id: user._id, role: user.role, name: user.name, email: user.email });
    return res.json({ 
      success: true, 
      message: 'Login successful!', 
      role: user.role 
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error. Please try again.' });
  }
};

// ─── FORGOT PASSWORD (POST /api/auth/forgot-password) ─────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const email = String(req.body.email || '').toLowerCase().trim();
    if (!email) {
      return res.render('forgot-password', { user: null, error: 'Please enter your email address.', success: null });
    }

    const user = await User.findOne({ email });
    if (user) {
      const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: '1h' });
      const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${encodeURIComponent(token)}`;
      await sendPasswordResetEmail(user.email, user.name || 'Student', resetUrl);
    } else {
      console.log(`Password reset requested for unknown email: ${email}`);
    }

    return res.render('forgot-password', {
      user: null,
      error: null,
      success: 'If an account with that email exists, a password reset link has been sent. Please check your inbox.'
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.render('forgot-password', { user: null, error: 'Unable to process the reset request. Please try again later.', success: null });
  }
};

// ─── RESET PASSWORD (POST /api/auth/reset-password) ──────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    if (!token) {
      return res.render('reset-password', { user: null, token: null, error: 'Reset token is missing. Please use the link from your email.', success: null });
    }

    if (!password || password.length < 6) {
      return res.render('reset-password', { user: null, token, error: 'Password must be at least 6 characters long.', success: null });
    }

    if (password !== confirmPassword) {
      return res.render('reset-password', { user: null, token, error: 'Passwords do not match.', success: null });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      console.error('Reset token error:', err);
      return res.render('reset-password', { user: null, token: null, error: 'Reset link is invalid or expired. Please request a new one.', success: null });
    }

    const user = await User.findOne({ email: decoded.email });
    if (!user) {
      return res.render('reset-password', { user: null, token: null, error: 'No account found for this reset request.', success: null });
    }

    user.password = password;
    await user.save();
    setTokenCookie(res, { id: user._id, role: user.role, name: user.name, email: user.email });

    return res.render('reset-password', { user: null, token: null, error: null, success: 'Your password has been reset successfully. You are now logged in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.render('reset-password', { user: null, token: null, error: 'Unable to reset password at this time. Please try again later.', success: null });
  }
};

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
const logout = (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
};

module.exports = { register, login, logout, forgotPassword, resetPassword };
