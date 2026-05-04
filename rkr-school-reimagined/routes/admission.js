const express = require('express');
const router = express.Router();
const {
  sendOTP,
  submitForm,
  getAllForms,
  approveForm,
  rejectForm,
  updateForm,
  deleteForm,
  uploadDocument,
  payFees,
  verifyFeesPayment,
  rejectFeeSubmission,
  updateFeesAmount,
  addResult,
} = require('../controllers/admissionController');

const { optionalAuth, adminOnly, protect } = require('../middleware/auth');

// POST /api/admission/send-otp — Public
router.post('/send-otp', sendOTP);

// POST /api/admission/submit — Public (optional auth to attach user ID)
router.post('/submit', optionalAuth, submitForm);

// GET /api/admission/forms — Admin only
router.get('/forms', adminOnly, getAllForms);

// PUT /api/admission/approve/:id — Admin only
router.put('/approve/:id', adminOnly, approveForm);

// PUT /api/admission/reject/:id — Admin only
router.put('/reject/:id', adminOnly, rejectForm);

// PUT /api/admission/update/:id — Admin only
router.put('/update/:id', adminOnly, updateForm);

// DELETE /api/admission/delete/:id — Admin only
router.delete('/delete/:id', adminOnly, deleteForm);

// POST /api/admission/upload/:id — Protect
router.post('/upload/:id', protect, uploadDocument);

// POST /api/admission/pay-fees/:id — Student submits UTR after PhonePe QR pay
router.post('/pay-fees/:id', protect, payFees);

// PUT /api/admission/verify-fees/:id — Admin verifies payment & issues receipt
router.put('/verify-fees/:id', adminOnly, verifyFeesPayment);

// PUT /api/admission/reject-fee-submission/:id — Admin clears bad submission
router.put('/reject-fee-submission/:id', adminOnly, rejectFeeSubmission);

// PUT /api/admission/fees/:id — Admin only
router.put('/fees/:id', adminOnly, updateFeesAmount);

// POST /api/admission/results/:id — Admin only
router.post('/results/:id', adminOnly, addResult);

// Legacy routes for compatibility with current frontend JS
router.post('/update-status', adminOnly, async (req, res) => {
  const { id, status } = req.body;
  const reqMock = { params: { id }, body: { status } };
  if (status === 'Approved') return approveForm(reqMock, res);
  if (status === 'Rejected') return rejectForm(reqMock, res);
  res.status(400).json({ message: 'Invalid status' });
});

router.post('/delete', adminOnly, async (req, res) => {
  const reqMock = { params: { id: req.body.id } };
  return deleteForm(reqMock, res);
});

module.exports = router;
