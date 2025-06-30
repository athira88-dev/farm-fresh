const nodemailer = require("nodemailer");

const sendOtpEmail = async (recipientEmail, otp) => {
  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      service: "Gmail", // Or use Outlook, Yahoo etc.
      auth: {
        user: process.env.EMAIL_USER, // e.g., your Gmail address
        pass: process.env.EMAIL_PASS, // e.g., your Gmail App Password (not your actual password)
      },
    });

    // Email options
    const mailOptions = {
      from: `"Farm Fresh" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject: "Your OTP Verification Code",
      html: `
        <div style="font-family:Arial, sans-serif; padding:20px; border:1px solid #ddd;">
          <h2>Hello from Farm Fresh 👋</h2>
          <p>Your OTP for verification is:</p>
          <h1 style="color:#28a745;">${otp}</h1>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${recipientEmail}`);
  } catch (error) {
    console.error("❌ Error sending OTP email:", error);
    throw error; // so it can be handled by caller
  }
};

module.exports = sendOtpEmail;
