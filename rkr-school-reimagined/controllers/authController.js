const User = require('../models/User');
const jwt = require('jsonwebtoken');

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

// ─── LOGOUT ────────────────────────────────────────────────────────────────────
const logout = (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
};

module.exports = { register, login, logout };
