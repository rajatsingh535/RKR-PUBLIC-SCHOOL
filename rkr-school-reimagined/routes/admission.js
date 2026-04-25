const express = require('express');
const router = express.Router();
const {
  submitForm,
  getAllForms,
  approveForm,
  rejectForm,
  updateForm,
  deleteForm
} = require('../controllers/admissionController');

const { optionalAuth, adminOnly } = require('../middleware/auth');

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
