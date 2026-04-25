const Admission = require('../models/Admission');
const { sendAdminNotification, sendStatusEmail } = require('../config/email');

// ─── SUBMIT FORM (POST /api/admission/submit) — Public ─────────────────────────
const submitForm = async (req, res) => {
  try {
    const { studentName, dob, gender, classApplying, parentName, email, phone, address, occupation } = req.body;

    // Validation
    if (!studentName || !dob || !gender || !classApplying || !parentName || !email || !phone || !address) {
      return res.status(400).json({ message: 'Please fill all required fields.' });
    }

    const admission = new Admission({
      studentName: studentName.trim(),
      dob,
      gender,
      classApplying,
      parentName: parentName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      address: address.trim(),
      occupation: occupation || '',
      status: 'Pending',
      userId: req.user ? req.user.id : null
    });

    await admission.save();

    // Send email to admin
    await sendAdminNotification(admission);

    res.json({
      message: '✅ Application submitted successfully! We will contact you shortly.',
      id: admission._id
    });

  } catch (err) {
    console.error('Submit error:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

// ─── GET ALL FORMS (GET /api/admission/forms) — Admin only ─────────────────────
const getAllForms = async (req, res) => {
  try {
    const admissions = await Admission.find().sort({ submittedAt: -1 });
    res.json(admissions);
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

// ─── APPROVE FORM (PUT /api/admission/approve/:id) — Admin only ────────────────
const approveForm = async (req, res) => {
  try {
    const admission = await Admission.findByIdAndUpdate(
      req.params.id,
      { status: 'Approved' },
      { new: true }
    );
    if (!admission) return res.status(404).json({ message: 'Record not found' });

    // Send email notification to user
    await sendStatusEmail(admission.email, admission.studentName, 'Approved');

    res.json({ message: `✅ ${admission.studentName}'s application has been Approved.` });
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

// ─── REJECT FORM (PUT /api/admission/reject/:id) — Admin only ──────────────────
const rejectForm = async (req, res) => {
  try {
    const admission = await Admission.findByIdAndUpdate(
      req.params.id,
      { status: 'Rejected' },
      { new: true }
    );
    if (!admission) return res.status(404).json({ message: 'Record not found' });

    // Send email notification to user
    await sendStatusEmail(admission.email, admission.studentName, 'Rejected');

    res.json({ message: `${admission.studentName}'s application has been Rejected.` });
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

// ─── UPDATE FORM (PUT /api/admission/update/:id) — Admin only ──────────────────
const updateForm = async (req, res) => {
  try {
    const admission = await Admission.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!admission) return res.status(404).json({ message: 'Record not found' });
    res.json({ message: 'Record updated successfully', admission });
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

// ─── DELETE FORM (DELETE /api/admission/delete/:id) — Admin only ────────────────
const deleteForm = async (req, res) => {
  try {
    const admission = await Admission.findByIdAndDelete(req.params.id);
    if (!admission) return res.status(404).json({ message: 'Record not found' });
    res.json({ message: 'Record deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

module.exports = { submitForm, getAllForms, approveForm, rejectForm, updateForm, deleteForm };
