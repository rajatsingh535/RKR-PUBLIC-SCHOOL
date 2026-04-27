const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Send email to admin when new form is submitted
const sendAdminNotification = async (formData) => {
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your-email@gmail.com') {
    console.log('⚠️  Email not configured. Skipping notification.');
    return;
  }

  const departmentRecipients = [
    process.env.ADMIN_EMAIL || 'rajatsinghcontact2004@gmaill.com',
    process.env.ADMISSION_DEPT_EMAIL || 'rajatsinghcontact2004@gmaill.com'
  ];

  const mailOptions = {
    from: `"RKR Public School" <${process.env.EMAIL_USER}>`,
    to: departmentRecipients.join(','),
    subject: `📋 New Admission: ${formData.studentName} — Class ${formData.classApplying}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #ddd;border-radius:8px;overflow:hidden;">
        <div style="background:#0a192f;color:white;padding:24px 32px;">
          <h2 style="margin:0;">New Admission Application</h2>
          <p style="margin:6px 0 0;opacity:0.7;">RKR Public School — Admissions 2026-27</p>
        </div>
        <div style="padding:32px;">
          <table style="width:100%;border-collapse:collapse;font-size:15px;">
            <tr><td style="padding:10px;font-weight:bold;color:#555;width:40%;">Student Name</td><td style="padding:10px;">${formData.studentName}</td></tr>
            <tr style="background:#f8fafc;"><td style="padding:10px;font-weight:bold;color:#555;">Class</td><td style="padding:10px;">${formData.classApplying}</td></tr>
            <tr><td style="padding:10px;font-weight:bold;color:#555;">DOB</td><td style="padding:10px;">${formData.dob}</td></tr>
            <tr style="background:#f8fafc;"><td style="padding:10px;font-weight:bold;color:#555;">Gender</td><td style="padding:10px;">${formData.gender}</td></tr>
            <tr><td style="padding:10px;font-weight:bold;color:#555;">Parent</td><td style="padding:10px;">${formData.parentName}</td></tr>
            <tr style="background:#f8fafc;"><td style="padding:10px;font-weight:bold;color:#555;">Phone</td><td style="padding:10px;">${formData.phone}</td></tr>
            <tr><td style="padding:10px;font-weight:bold;color:#555;">Email</td><td style="padding:10px;">${formData.email}</td></tr>
            <tr style="background:#f8fafc;"><td style="padding:10px;font-weight:bold;color:#555;">Address</td><td style="padding:10px;">${formData.address}</td></tr>
          </table>
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
const sendSubmissionReceivedEmail = async (userEmail, studentName, classApplying) => {
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your-email@gmail.com') return;

  const mailOptions = {
    from: `"RKR Public School" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    cc: process.env.STUDENT_DEPT_EMAIL || 'rajatsinghcontact2004@gmaill.com',
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
          <br>
          <p>Regards,<br><strong>RKR Public School Admissions Team</strong></p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Submission email sent to ${userEmail}`);
  } catch (err) {
    console.error('❌ Submission email error:', err.message);
  }
};

// Send email to user when form status changes
const sendStatusEmail = async (userEmail, studentName, status) => {
  if (!process.env.EMAIL_USER || process.env.EMAIL_USER === 'your-email@gmail.com') return;

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

module.exports = { sendAdminNotification, sendSubmissionReceivedEmail, sendStatusEmail };
