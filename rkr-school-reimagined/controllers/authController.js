const User = require('../models/User');
const jwt = require('jsonwebtoken');

// ─── Fixed credentials (not in DB) ────────────────────────────────────────────
const FIXED_ADMIN = {
  email: 'admin@rkrschool.com',
  password: 'admin123',
  name: 'Administrator',
  role: 'admin'
};

const FIXED_STUDENT = {
  email: 'student@rkrschool.com',
  password: 'student123',
  name: 'Student User',
  role: 'student'
};

// Helper: create JWT and set cookie
const setTokenCookie = (res, payload) => {
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });
  res.cookie('token', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });
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

    setTokenCookie(res, { id: user._id, role: user.role, name: user.name });
    return res.redirect('/status');

  } catch (err) {
    console.error('Register error:', err);
    return res.render('register', { user: null, error: 'Registration failed. Please try again.' });
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
      return res.redirect('/admin');
    }

    // 2. Check fixed student
    if (emailLower === FIXED_STUDENT.email && password === FIXED_STUDENT.password) {
      setTokenCookie(res, { id: 'student_fixed', role: 'student', name: FIXED_STUDENT.name });
      return res.redirect('/status');
    }

    // 3. Check database user
    const user = await User.findOne({ email: emailLower });
    if (!user) {
      return res.render('login', { user: null, error: 'No account found with that email.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.render('login', { user: null, error: 'Incorrect password.' });
    }

    setTokenCookie(res, { id: user._id, role: user.role, name: user.name });
    return res.redirect(user.role === 'admin' ? '/admin' : '/status');

  } catch (err) {
    console.error('Login error:', err);
    return res.render('login', { user: null, error: 'Server error. Please try again.' });
  }
};

// ─── LOGOUT ────────────────────────────────────────────────────────────────────
const logout = (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
};

module.exports = { register, login, logout };
