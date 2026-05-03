const Admission = require('../models/Admission');
const OTP = require('../models/OTP');
const { sendAdminNotification, sendSubmissionReceivedEmail, sendStatusEmail, sendOTPEmail } = require('../config/email');
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizePhone = (value = '') => value.replace(/\D/g, '');

// ─── SEND OTP (POST /api/admission/send-otp) — Public ────────────────────────
const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    // Check if email already exists
    const existingAdmission = await Admission.findOne({ email: normalizedEmail });
    if (existingAdmission) {
      return res.status(409).json({ message: 'An application has already been submitted with this email.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Remove any existing OTP for this email
    await OTP.deleteMany({ email: normalizedEmail });

    // Save new OTP
    await new OTP({ email: normalizedEmail, otp }).save();

    // Send Email
    await sendOTPEmail(normalizedEmail, otp);

    res.json({ message: 'OTP sent successfully. Please check your email.' });
  } catch (err) {
    console.error('Send OTP error:', err);
    let errorMsg = err.message;
    if (errorMsg.includes('Failed to send OTP email')) {
      errorMsg += ' (Please verify EMAIL and EMAIL_PASS in Vercel settings. Use a 16-character App Password, not your normal password).';
    } else if (errorMsg.includes('connect') || errorMsg.includes('Mongoose') || errorMsg.includes('timeout')) {
      errorMsg += ' (MongoDB connection failed. Please ensure 0.0.0.0/0 is whitelisted in MongoDB Atlas Network Access).';
    }
    res.status(500).json({ message: 'Server error: ' + errorMsg });
  }
};

// ─── SUBMIT FORM (POST /api/admission/submit) — Public ─────────────────────────
const submitForm = async (req, res) => {
  try {
    const { studentName, dob, gender, classApplying, parentName, email, phone, address, occupation, otp } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPhone = normalizePhone(String(phone || '').trim());

    // Validation
    if (!studentName || !dob || !gender || !classApplying || !parentName || !email || !phone || !address || !otp) {
      return res.status(400).json({ message: 'Please fill all required fields including OTP.' });
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    if (normalizedPhone.length < 10) {
      return res.status(400).json({ message: 'Please enter a valid phone number.' });
    }

    // Check for existing application by email
    const existingByEmail = await Admission.findOne({ email: normalizedEmail });
    if (existingByEmail) {
      return res.status(409).json({ message: 'An application already exists for this email.' });
    }

    // Verify OTP
    const validOtpRecord = await OTP.findOne({ email: normalizedEmail, otp });
    if (!validOtpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP. Please request a new one.' });
    }

    const existingByPhone = await Admission.findOne({
      $or: [{ phone: phone.trim() }, { phone: normalizedPhone }]
    });
    if (existingByPhone) {
      return res.status(409).json({ message: 'Application already exists for this phone number.' });
    }

    const admission = new Admission({
      studentName: studentName.trim(),
      dob,
      gender,
      classApplying,
      parentName: parentName.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      address: address.trim(),
      occupation: occupation || '',
      status: 'Pending',
      userId: req.user ? req.user.id : null
    });

    await admission.save();

    // Remove OTP after successful submission
    await OTP.deleteMany({ email: normalizedEmail });

    // Send email to admin/department and acknowledgement to applicant
    await sendAdminNotification(admission);
    await sendSubmissionReceivedEmail(admission);

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

module.exports = { sendOTP, submitForm, getAllForms, approveForm, rejectForm, updateForm, deleteForm };
