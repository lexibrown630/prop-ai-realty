import nodemailer from "nodemailer";

// These should match your Netlify environment variables
const GMAIL_USER = process.env.GMAIL_USER;  // bookings@propai-bookings.art
const GMAIL_PASS = process.env.GMAIL_PASS;  // 16-character app password

export async function sendConfirmationEmail(toEmail, bookingDetails) {
  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS,
      },
    });

    // Email options
    const mailOptions = {
      from: `"PropAI Bookings" <${GMAIL_USER}>`,
      to: toEmail,
      subject: "Your Booking is Confirmed!",
      text: `Hi there!\n\nYour booking is confirmed:\n${bookingDetails}\n\nThank you for using PropAI!`,
      html: `<p>Hi there!</p>
             <p>Your booking is confirmed:</p>
             <pre>${bookingDetails}</pre>
             <p>Thank you for using <strong>PropAI</strong>!</p>`,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}
