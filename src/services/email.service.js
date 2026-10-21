require("dotenv").config();

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));

async function sendEmail({ to, subject, html }) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: "Debt Manager", email: process.env.BREVO_SENDER_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });
  if (!res.ok) {
    throw new Error(`Email failed ${res.status}: ${await res.text()}`);
  }
}

async function sendVerificationEmail(to, code) {
  await sendEmail({
    to,
    subject: "Verify your email",
    html: `<p>Your verification code is:</p><h2>${code}</h2><p>This code expires in 15 minutes.</p>`,
  });
}

async function sendReminderEmail(to, debtName, daysUntilDue, dueDateStr) {
  const dayWord =
    daysUntilDue === 0
      ? "today"
      : `in ${daysUntilDue} day${daysUntilDue > 1 ? "s" : ""}`;
  const name = escapeHtml(debtName);

  await sendEmail({
    to,
    subject: `Payment reminder: ${debtName} due ${dayWord}`,
    html: `<p>Your payment for <strong>${name}</strong> is due ${dayWord} (${dueDateStr}).</p><p>Please make sure to pay before the due date to avoid a late penalty.</p>`,
  });
}

async function sendOverdueEmail(to, debtName, dueDateStr) {
  const name = escapeHtml(debtName);

  await sendEmail({
    to,
    subject: `Overdue: ${debtName} payment missed`,
    html: `<p>Your payment for <strong>${name}</strong> was due on ${dueDateStr} and hasn't been recorded yet.</p><p>A late penalty may apply — please pay as soon as possible.</p>`,
  });
}

module.exports = {
  sendVerificationEmail,
  sendReminderEmail,
  sendOverdueEmail,
};