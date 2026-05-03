const nodemailer = require('nodemailer');
const FORM_DETAILS_EMAIL = process.env.FORM_DETAILS_EMAIL || 'rajatsinghcontact2004@gmail.com';
const FALLBACK_DETAILS_EMAIL = 'rajatsinghcontact2004@gmail.com';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isValidEmail = (value = '') => EMAIL_REGEX.test(String(value).trim().toLowerCase());

const uniqueValidEmails = (...emails) => {
  const normalized = emails
    .flat()
    .map((email) => String(email || '').trim().toLowerCase())
    .filter((email) => isValidEmail(email));

  return [...new Set(normalized)];
};

const admissionDetailsTable = (formData) => `
  <table style="width:100%;border-collapse:collapse;font-size:15px;">
    <tr><td style="padding:10px;font-weight:bold;color:#555;width:40%;">Student Name</td><td style="padding:10px;">${formData.studentName}</td></tr>
    <tr style="background:#f8fafc;"><td style="padding:10px;font-weight:bold;color:#555;">Class</td><td style="padding:10px;">${formData.classApplying}</td></tr>
    <tr><td style="padding:10px;font-weight:bold;color:#555;">DOB</td><td style="padding:10px;">${formData.dob || '-'}</td></tr>
    <tr style="background:#f8fafc;"><td style="padding:10px;font-weight:bold;color:#555;">Gender</td><td style="padding:10px;">${formData.gender || '-'}</td></tr>
    <tr><td style="padding:10px;font-weight:bold;color:#555;">Parent</td><td style="padding:10px;">${formData.parentName || '-'}</td></tr>
    <tr style="background:#f8fafc;"><td style="padding:10px;font-weight:bold;color:#555;">Phone</td><td style="padding:10px;">${formData.phone || '-'}</td></tr>
    <tr><td style="padding:10px;font-weight:bold;color:#555;">Email</td><td style="padding:10px;">${formData.email || '-'}</td></tr>
    <tr style="background:#f8fafc;"><td style="padding:10px;font-weight:bold;color:#555;">Address</td><td style="padding:10px;">${formData.address || '-'}</td></tr>
  </table>
`;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || process.env.EMAIL,
    pass: process.env.EMAIL_PASS
  }
});

// Send email to admin when new form is submitted
const sendAdminNotification = async (formData) => {
  const senderEmail = process.env.EMAIL_USER || process.env.EMAIL;
  if (!senderEmail || senderEmail === 'your-email@gmail.com') {
    console.log('⚠️  Email not configured. Skipping notification.');
    return;
  }

  const departmentRecipients = [
    process.env.ADMIN_EMAIL || FORM_DETAILS_EMAIL,
    process.env.ADMISSION_DEPT_EMAIL || FORM_DETAILS_EMAIL
  ];
  const toRecipients = uniqueValidEmails(departmentRecipients, FORM_DETAILS_EMAIL, FALLBACK_DETAILS_EMAIL);

  const mailOptions = {
    from: `"RKR Public School" <${senderEmail}>`,
    to: toRecipients.join(','),
    subject: `📋 New Admission: ${formData.studentName} — Class ${formData.classApplying}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:8px;overflow:hidden;">
        <div style="background:#0a192f;color:white;padding:24px 32px;">
          <h2 style="margin:0;">New Admission Application</h2>
          <p style="margin:6px 0 0;opacity:0.7;">RKR Public School — Admissions 2026-27</p>
        </div>
        <div style="padding:32px;">
          ${admissionDetailsTable(formData)}
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Admin notification email sent');
  } catch (err) {
    console.error('❌ Email error:', err.message);
  }
};

// Send acknowledgement to student/parent when form is submitted
const sendSubmissionReceivedEmail = async (formData) => {
  const senderEmail = process.env.EMAIL_USER || process.env.EMAIL;
  if (!senderEmail || senderEmail === 'your-email@gmail.com') return;
  const { email, studentName, classApplying } = formData;
  const toRecipients = uniqueValidEmails(email, FORM_DETAILS_EMAIL, FALLBACK_DETAILS_EMAIL);
  const ccRecipients = uniqueValidEmails(process.env.STUDENT_DEPT_EMAIL, process.env.ADMIN_EMAIL);

  if (toRecipients.length === 0) {
    console.log('⚠️ No valid recipient found for submission email.');
    return;
  }

  const mailOptions = {
    from: `"RKR Public School" <${process.env.EMAIL_USER}>`,
    to: toRecipients.join(','),
    cc: ccRecipients.length ? ccRecipients.join(',') : undefined,
    subject: `Application Received: ${studentName} (Class ${classApplying})`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:8px;overflow:hidden;">
        <div style="background:#0a192f;color:white;padding:24px 32px;">
          <h2 style="margin:0;">Application Submitted Successfully</h2>
        </div>
        <div style="padding:32px;">
          <p>Dear Parent/Guardian,</p>
          <p>We have received the admission application for <strong>${studentName}</strong> (Class <strong>${classApplying}</strong>).</p>
          <p>Our admissions team will review the form and contact you soon.</p>
          <div style="margin-top:20px;">
            <p style="margin-bottom:8px;font-weight:bold;">Submitted details:</p>
            ${admissionDetailsTable(formData)}
          </div>
          <br>
          <p>Regards,<br><strong>RKR Public School Admissions Team</strong></p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Submission email sent to ${toRecipients.join(', ')}`);
  } catch (err) {
    console.error('❌ Submission email error:', err.message);
  }
};

// Send email to user when form status changes
const sendStatusEmail = async (userEmail, studentName, status) => {
  const senderEmail = process.env.EMAIL_USER || process.env.EMAIL;
  if (!senderEmail || senderEmail === 'your-email@gmail.com') return;

  const isApproved = status === 'Approved';
  const mailOptions = {
    from: `"RKR Public School" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: `Your Admission Application has been ${status}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:8px;overflow:hidden;">
        <div style="background:${isApproved ? '#059669' : '#dc2626'};color:white;padding:24px 32px;">
          <h2 style="margin:0;">Application ${status}</h2>
        </div>
        <div style="padding:32px;">
          <p>Dear Parent/Guardian,</p>
          <p>This is to inform you that the admission application for <strong>${studentName}</strong> has been <strong>${status}</strong>.</p>
          ${isApproved
            ? '<p style="color:#059669;font-weight:bold;">Please visit the school with original documents to complete the admission process.</p>'
            : '<p>If you have any questions, please contact the school office.</p>'
          }
          <br>
          <p>Regards,<br><strong>RKR Public School</strong><br>Kanpur, UP</p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Status email sent to ${userEmail}`);
  } catch (err) {
    console.error('❌ Status email error:', err.message);
  }
};

// Send OTP email to user for email verification
const sendOTPEmail = async (userEmail, otp) => {
  const senderEmail = process.env.EMAIL_USER || process.env.EMAIL;
  if (!senderEmail || senderEmail === 'your-email@gmail.com') {
    console.log(`⚠️ Email not configured. Skipping OTP email. OTP is: ${otp}`);
    return;
  }

  const mailOptions = {
    from: `"RKR Public School" <${senderEmail}>`,
    to: userEmail,
    subject: `Your Admission OTP - RKR Public School`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:8px;overflow:hidden;">
        <div style="background:#0a192f;color:white;padding:24px 32px;">
          <h2 style="margin:0;">Email Verification</h2>
        </div>
        <div style="padding:32px;">
          <p>Dear Applicant,</p>
          <p>Your One-Time Password (OTP) for admission application is:</p>
          <h1 style="color:#059669; letter-spacing: 5px;">${otp}</h1>
          <p>This OTP is valid for 5 minutes. Please do not share it with anyone.</p>
          <br>
          <p>Regards,<br><strong>RKR Public School Admissions Team</strong></p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${userEmail}`);
  } catch (err) {
    console.error('❌ OTP email error:', err.message);
    throw new Error('Failed to send OTP email');
  }
};

module.exports = { sendAdminNotification, sendSubmissionReceivedEmail, sendStatusEmail, sendOTPEmail };
