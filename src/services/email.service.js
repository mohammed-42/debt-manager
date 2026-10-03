require("dotenv").config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  family: 4,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const FROM_EMAIL = process.env.GMAIL_USER;

async function sendVerificationEmail(to, code) {
  await transporter.sendMail({
    from: FROM_EMAIL,
    to,
    subject: "Verify your email",
    html: `<p>Your verification code is:</p><h2>${code}</h2><p>This code expires in 15 minutes.</p>`,
  });
}

async function sendReminderEmail(
  to,
  debtName,
  daysUntilDue,
  dueDateStr
) {
  const dayWord =
    daysUntilDue === 0
      ? "today"
      : `in ${daysUntilDue} day${daysUntilDue > 1 ? "s" : ""}`;

  await transporter.sendMail({
    from: FROM_EMAIL,
    to,
    subject: `Payment reminder: ${debtName} due ${dayWord}`,
    html: `<p>Your payment for <strong>${debtName}</strong> is due ${dayWord} (${dueDateStr}).</p><p>Please make sure to pay before the due date to avoid a late penalty.</p>`,
  });
}

async function sendOverdueEmail(
  to,
  debtName,
  dueDateStr
) {
  await transporter.sendMail({
    from: FROM_EMAIL,
    to,
    subject: `Overdue: ${debtName} payment missed`,
    html: `<p>Your payment for <strong>${debtName}</strong> was due on ${dueDateStr} and hasn't been recorded yet.</p><p>A late penalty may apply — please pay as soon as possible.</p>`,
  });
}

module.exports = {
  sendVerificationEmail,
  sendReminderEmail,
  sendOverdueEmail,
};