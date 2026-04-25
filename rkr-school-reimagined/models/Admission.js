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
  submittedAt:   { type: Date, default: Date.now }
});

module.exports = mongoose.model('Admission', admissionSchema);
