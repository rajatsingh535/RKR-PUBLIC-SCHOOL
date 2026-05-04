const Admission = require('../models/Admission');
const OTP = require('../models/OTP');
const { sendAdminNotification, sendSubmissionReceivedEmail, sendStatusEmail, sendOTPEmail } = require('../config/email');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizePhone = (value = '') => value.replace(/\D/g, '');
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const isRazorpayConfigured = () => Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
const razorpay = isRazorpayConfigured()
  ? new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET })
  : null;

const hasAdmissionAccess = (user, admission) => {
  if (!user || !admission) return false;
  if (user.role === 'admin') return true;
  const sameUserId = String(admission.userId) === String(user.id);
  const sameEmail =
    user.email &&
    admission.email &&
    String(admission.email).toLowerCase() === String(user.email).toLowerCase();
  return sameUserId || sameEmail;
};

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
    res.status(500).json({ message: 'Server error: ' + err.message });
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
    const updateData = { status: 'Approved' };
    
    // Allow admin to set feesAmount along with approval
    if (req.body && req.body.feesAmount !== undefined) {
      updateData.feesAmount = Number(req.body.feesAmount) || 0;
    }

    const admission = await Admission.findByIdAndUpdate(
      req.params.id,
      updateData,
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

// ─── UPLOAD DOCUMENT (POST /api/admission/upload/:id) — Protect ──────────────
const uploadDocument = async (req, res) => {
  try {
    const { name, fileType, data } = req.body;
    if (!name || !data) return res.status(400).json({ message: 'Missing document data' });

    const admission = await Admission.findById(req.params.id);
    if (!admission) return res.status(404).json({ message: 'Admission not found' });

    const isAdmin = req.user && req.user.role === 'admin';
    const sameUserId = req.user && String(admission.userId) === String(req.user.id);
    const sameEmail =
      req.user &&
      req.user.email &&
      admission.email &&
      String(admission.email).toLowerCase() === String(req.user.email).toLowerCase();
    if (req.user && !isAdmin && !sameUserId && !sameEmail) {
      return res.status(403).json({ message: 'Unauthorized access to this application' });
    }

    admission.documents.push({ name, fileType, data });
    await admission.save();

    res.json({ message: 'Document uploaded successfully', admission });
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

// ─── CREATE RAZORPAY ORDER (POST /api/admission/pay-fees/:id) — Student ───────
const payFees = async (req, res) => {
  try {
    if (!isRazorpayConfigured() || !razorpay) {
      return res.status(500).json({ message: 'Razorpay is not configured on server.' });
    }
    if (req.user && req.user.role === 'admin') {
      return res.status(400).json({ message: 'Admin payments are disabled from this endpoint.' });
    }

    const admission = await Admission.findById(req.params.id);
    if (!admission) return res.status(404).json({ message: 'Admission not found' });

    if (!hasAdmissionAccess(req.user, admission)) {
      return res.status(403).json({ message: 'Unauthorized access to this application' });
    }

    if (admission.status !== 'Approved') {
      return res.status(400).json({ message: 'Fee payment is only available after approval.' });
    }
    if (!admission.feesAmount || admission.feesAmount <= 0) {
      return res.status(400).json({ message: 'Fee amount has not been set yet. Contact the school.' });
    }
    if (admission.feesPaid) {
      return res.status(400).json({ message: 'Fees already paid.' });
    }

    const amountPaise = Math.round(Number(admission.feesAmount) * 100);
    const receipt = `RKRADM_${String(admission._id).slice(-8)}_${Date.now()}`.slice(0, 40);
    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt,
      notes: {
        admissionId: String(admission._id),
        studentName: admission.studentName,
      },
    });

    admission.razorpayOrderId = order.id;
    admission.feesVerificationPending = false;
    admission.studentPaymentReference = '';
    admission.feesSubmittedAt = null;
    await admission.save();

    res.json({
      message: 'Razorpay order created.',
      keyId: RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      studentName: admission.studentName,
      email: admission.email,
      phone: admission.phone,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

// ─── VERIFY RAZORPAY PAYMENT (POST /api/admission/verify-payment/:id) — Student ─
const verifyRazorpayPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: 'Missing Razorpay verification details.' });
    }

    const admission = await Admission.findById(req.params.id);
    if (!admission) return res.status(404).json({ message: 'Admission not found' });
    if (!hasAdmissionAccess(req.user, admission)) {
      return res.status(403).json({ message: 'Unauthorized access to this application' });
    }
    if (admission.feesPaid) {
      return res.status(400).json({ message: 'Fees already paid.' });
    }
    if (admission.razorpayOrderId && admission.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({ message: 'Invalid payment order for this application.' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: 'Payment signature verification failed.' });
    }

    admission.feesPaid = true;
    admission.feesPaidAt = new Date();
    admission.transactionId = razorpay_payment_id;
    admission.razorpayPaymentId = razorpay_payment_id;
    admission.razorpayOrderId = razorpay_order_id;
    admission.paymentGateway = 'razorpay';
    admission.receiptNumber = admission.receiptNumber || genReceiptNo();
    admission.feesVerificationPending = false;
    admission.studentPaymentReference = '';
    admission.feesSubmittedAt = null;
    await admission.save();

    res.json({ message: 'Payment verified successfully. Receipt generated.', admission });
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

const genReceiptNo = () => 'RKR-F' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();

// ─── ADMIN: VERIFY OFFLINE PAYMENT ───────────────────────────────────────────
const verifyFeesPayment = async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id);
    if (!admission) return res.status(404).json({ message: 'Admission not found' });

    if (admission.feesPaid) {
      return res.status(400).json({ message: 'Fees already marked as paid.' });
    }
    if (!admission.feesVerificationPending) {
      return res.status(400).json({ message: 'No pending payment submission to verify.' });
    }

    admission.feesPaid = true;
    admission.feesPaidAt = new Date();
    admission.transactionId = admission.studentPaymentReference;
    admission.receiptNumber = genReceiptNo();
    admission.feesVerificationPending = false;
    await admission.save();

    res.json({ message: 'Payment verified. Receipt issued to the student.', admission });
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

// ─── ADMIN: REJECT STUDENT PAYMENT SUBMISSION (allow resubmit) ───────────────
const rejectFeeSubmission = async (req, res) => {
  try {
    const admission = await Admission.findById(req.params.id);
    if (!admission) return res.status(404).json({ message: 'Admission not found' });

    if (!admission.feesVerificationPending) {
      return res.status(400).json({ message: 'There is no pending fee submission to reject.' });
    }

    admission.feesVerificationPending = false;
    admission.studentPaymentReference = '';
    admission.feesSubmittedAt = null;
    await admission.save();

    res.json({ message: 'Submission cleared. Student can submit a new reference.', admission });
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

// ─── UPDATE FEES AMOUNT (PUT /api/admission/fees/:id) — Admin only ───────────
const updateFeesAmount = async (req, res) => {
  try {
    const { feesAmount } = req.body;
    const admission = await Admission.findByIdAndUpdate(
      req.params.id,
      { feesAmount: Number(feesAmount) || 0 },
      { new: true }
    );
    if (!admission) return res.status(404).json({ message: 'Admission not found' });

    res.json({ message: 'Fees amount updated successfully', admission });
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

// ─── ADD RESULT (POST /api/admission/results/:id) — Admin only ───────────────
const addResult = async (req, res) => {
  try {
    const { subject, marks, grade } = req.body;
    const admission = await Admission.findById(req.params.id);
    if (!admission) return res.status(404).json({ message: 'Admission not found' });

    admission.results.push({ subject, marks, grade });
    await admission.save();

    res.json({ message: 'Result added successfully', admission });
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
};

module.exports = {
  sendOTP,
  submitForm,
  getAllForms,
  approveForm,
  rejectForm,
  updateForm,
  deleteForm,
  uploadDocument,
  payFees,
  verifyRazorpayPayment,
  verifyFeesPayment,
  rejectFeeSubmission,
  updateFeesAmount,
  addResult,
};
