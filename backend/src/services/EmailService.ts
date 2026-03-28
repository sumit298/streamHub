const nodemailer = require("nodemailer");

class EmailService {
  async sendPasswordReset(email, resetUrl) {
     if (!process.env.MAIL_FROM) {
      throw new Error("MAIL_FROM is required");
    }
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      auth: {
        user: process.env.BREVO_SMTP_LOGIN,
        pass: process.env.BREVO_SMTP_KEY,
      },
    });
    return transporter.sendMail({
      from: `"StreamHub" <${process.env.MAIL_FROM}>`,
      to: email,
      subject: "Reset your StreamHub password",
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0f0f1a;border-radius:12px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#10b981,#7c3aed);padding:28px 32px">
            <h1 style="color:white;margin:0;font-size:24px;font-weight:700;letter-spacing:-0.5px">StreamHub</h1>
            <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px">Live Streaming Platform</p>
          </div>
          <div style="padding:32px;background:#0f0f1a">
            <h2 style="color:#ffffff;margin:0 0 12px;font-size:20px">Reset your password</h2>
            <p style="color:#9ca3af;font-size:15px;line-height:1.6;margin:0 0 24px">
              You requested a password reset for your StreamHub account. Click the button below to set a new password.
            </p>
            <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#10b981,#059669);color:white;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;margin-bottom:24px">
              Reset Password
            </a>
            <div style="border-top:1px solid #1f2937;padding-top:20px;margin-top:8px">
              <p style="color:#6b7280;font-size:12px;margin:0 0 8px">This link expires in <strong style="color:#9ca3af">1 hour</strong>. If you didn't request this, you can safely ignore this email.</p>
              <p style="color:#4b5563;font-size:11px;margin:0;word-break:break-all">Or copy this link: <a href="${resetUrl}" style="color:#10b981">${resetUrl}</a></p>
            </div>
          </div>
        </div>
      `,
    });
  }
}

module.exports = new EmailService();
