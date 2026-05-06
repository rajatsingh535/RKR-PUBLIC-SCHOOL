const express = require('express');
const router = express.Router();
const Admission = require('../models/Admission');
const jwt = require('jsonwebtoken');

// Helper to check auth from cookie
const checkUser = (req) => {
  const token = req.cookies.token;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'rkr-school-secret-key-2026');
  } catch (err) {
    return null;
  }
};

router.get('/', (req, res) => {
  res.render('index', { user: checkUser(req) });
});

router.get('/about', (req, res) => {
  res.render('about', { user: checkUser(req) });
});

router.get('/principal', (req, res) => {
  res.render('principal', { user: checkUser(req) });
});

router.get('/academics', (req, res) => {
  res.render('academics', { user: checkUser(req) });
});

router.get('/facilities', (req, res) => {
  res.render('facilities', { user: checkUser(req) });
});

router.get('/admissions', (req, res) => {
  res.render('admissions', { user: checkUser(req) });
});

router.get('/gallery', (req, res) => {
  res.render('gallery', { user: checkUser(req) });
});

router.get('/news', (req, res) => {
  res.render('news', { user: checkUser(req) });
});

router.get('/achievements', (req, res) => {
  res.render('achievements', { user: checkUser(req) });
});

router.get('/contact', (req, res) => {
  res.render('contact', { user: checkUser(req) });
});

router.get('/login', (req, res) => {
  if (checkUser(req)) return res.redirect('/');
  res.render('login', { user: null, error: null });
});

router.get('/forgot-password', (req, res) => {
  if (checkUser(req)) return res.redirect('/');
  res.render('forgot-password', { user: null, error: null, success: null });
});

router.get('/reset-password', (req, res) => {
  if (checkUser(req)) return res.redirect('/');
  res.render('reset-password', { user: null, token: req.query.token || '', error: null, success: null });
});

router.get('/register', (req, res) => {
  res.redirect('/login');
});

const canAccessAdmission = (user, admission) => {
  if (!user || !admission) return false;
  if (user.role === 'admin') return true;
  if (String(admission.userId) === String(user.id)) return true;
  if (
    user.email &&
    admission.email &&
    String(admission.email).toLowerCase() === String(user.email).toLowerCase()
  ) {
    return true;
  }
  return false;
};

router.get('/receipt/:id', async (req, res) => {
  const user = checkUser(req);
  if (!user) return res.redirect('/login');

  const admission = await Admission.findById(req.params.id);
  if (!admission) return res.status(404).send('Application not found.');
  if (!admission.feesPaid) {
    return res.status(403).send('Receipt is available only after the school verifies your payment.');
  }
  if (!canAccessAdmission(user, admission)) {
    return res.status(403).send('You are not allowed to view this receipt.');
  }

  const payeeName = process.env.FEE_PAYEE_NAME || 'RAJAT SINGH';
  res.render('receipt', { user, admission, payeeName });
});

router.get('/status', async (req, res) => {
  const user = checkUser(req);
  if (!user) return res.redirect('/login');
  
  // Find admissions linked to this user ID
  let admissions = [];
  
  if (user.id && user.id.length === 24) {
    admissions = await Admission.find({ userId: user.id });
  }

  // If no records found by ID, try finding by email to link them
  if (admissions.length === 0 && user.email) {
    const emailAdmissions = await Admission.find({ 
      email: user.email.toLowerCase(),
      userId: null // Only pick up unlinked ones to prevent "stealing" or leaking
    });
    
    if (emailAdmissions.length > 0) {
      for (let adm of emailAdmissions) {
        adm.userId = user.id;
        await adm.save();
      }
      admissions = emailAdmissions;
    }
  }

  res.render('status', { user, admissions });
});

router.get('/admin', async (req, res) => {
  const user = checkUser(req);
  if (!user || user.role !== 'admin') return res.redirect('/login');
  
  const admissions = await Admission.find().sort({ submittedAt: -1 });
  res.render('admin', { user, admissions });
});

router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/');
});

module.exports = router;
