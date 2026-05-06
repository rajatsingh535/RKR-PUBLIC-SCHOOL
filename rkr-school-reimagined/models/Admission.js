const mongoose = require('mongoose');

const admissionSchema = new mongoose.Schema({
  studentName:   { type: String, required: true, trim: true },
  dob:           { type: String, required: true },
  gender:        { type: String, required: true },
  classApplying: { type: String, required: true },
  parentName:    { type: String, required: true, trim: true },
  email:         { type: String, required: true, lowercase: true, trim: true },
  phone:         { type: String, required: true, trim: true },
  address:       { type: String, required: true, trim: true },
  occupation:    { type: String, default: '' },
  status:        { type: String, default: 'Pending', enum: ['Pending', 'Approved', 'Rejected'] },
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  documents:     [{ name: String, fileType: String, data: String, uploadedAt: { type: Date, default: Date.now } }],
  feesPaid:      { type: Boolean, default: false },
  feesAmount:    { type: Number, default: 0 },
  feesPaidAt:    { type: Date, default: null },
  transactionId: { type: String, default: '' },
  paymentGateway: { type: String, default: '' },
  stripePaymentIntentId: { type: String, default: '' },
  receiptNumber: { type: String, default: '' },
  feesVerificationPending: { type: Boolean, default: false },
  studentPaymentReference: { type: String, default: '' },
  feesSubmittedAt: { type: Date, default: null },
  results:       [{ subject: String, marks: String, grade: String, addedAt: { type: Date, default: Date.now } }],
  submittedAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('Admission', admissionSchema);
