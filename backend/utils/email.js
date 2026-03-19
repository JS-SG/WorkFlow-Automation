const { Resend } = require("resend");

// Client is created lazily so a missing API key doesn't crash the server at startup
let _resend = null;
function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

/**
 * Send an email notification.
 * @param {string} to 
 * @param {string} subject 
 * @param {string} message 
 */
const sendEmail = async (to, subject, message) => {
  if (!to) return;
  
  const resend = getResend();
  if (!resend) {
    console.warn("⚠️  Email skipped — RESEND_API_KEY not set in .env");
    return;
  }

  try {
    const dashboardUrl = `${import.meta.env.VITE_API_URL}/notifications`;
    const htmlContent = `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; borderRadius: 8px;">
        <h2 style="color: #6366f1;">Workflow Notification</h2>
        <p>${message}</p>
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <a href="${dashboardUrl}" style="background-color: #6366f1; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">View in Dashboard</a>
        </div>
        <p style="font-size: 12px; color: #999; margin-top: 30px;">
          This is an automated message from your Workflow Management System.
        </p>
      </div>
    `;

    await resend.emails.send({
      from: "Workflow Agent <onboarding@resend.dev>",
      to: to,
      subject: subject,
      html: htmlContent
    });
    console.log(`✅ Email sent to ${to}`);
  } catch (error) {
    console.error("❌ Failed to send email:", error.message);
  }
};

module.exports = { sendEmail };
