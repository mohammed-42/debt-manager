const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.EMAIL_FROM || "onboarding@resend.dev";

async function sendVerificationEmail(to, code) {
  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Verify your email",
    html: `<p>Your verification code is:</p><h2>${code}</h2><p>This code expires in 15 minutes.</p>`,
  });
}

module.exports = { sendVerificationEmail };