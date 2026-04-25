const jwt = require('jsonwebtoken');

// Protect routes — requires login
const protect = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.redirect('/login');
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.clearCookie('token');
    return res.redirect('/login');
  }
};

// Admin-only middleware
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.redirect('/login');
  }
  next();
};

// Optional auth — attach user if logged in, don't block
const optionalAuth = (req, res, next) => {
  const token = req.cookies.token;
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch (e) { /* token expired, ignore */ }
  }
  next();
};

// Helper — check user from cookie (for EJS templates)
const checkUser = (req) => {
  const token = req.cookies.token;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return null;
  }
};

module.exports = { protect, adminOnly, optionalAuth, checkUser };
