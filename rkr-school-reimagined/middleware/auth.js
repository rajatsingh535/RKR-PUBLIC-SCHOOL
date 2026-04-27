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
  let user = req.user;

  // API routes often don't pass through protect middleware, so decode from cookie.
  if (!user) {
    const token = req.cookies.token;
    if (token) {
      try {
        user = jwt.verify(token, process.env.JWT_SECRET);
        req.user = user;
      } catch (err) {
        // invalid token handled by auth check below
      }
    }
  }

  if (!user || user.role !== 'admin') {
    const isApiRequest = req.originalUrl.startsWith('/api/');
    if (isApiRequest) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
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
