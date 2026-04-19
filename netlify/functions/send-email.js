import nodemailer from "nodemailer";

export async function handler(event) {
  console.log("FUNCTION RUNNING");

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    // For now: hardcode email to TEST
    const toEmail = "airealty.agency26@gmail.com";

    const mailOptions = {
      from: `"PropAI Bookings" <${process.env.GMAIL_USER}>`,
      to: toEmail,
      subject: "TEST EMAIL",
      text: "Your email system is working ✅",
    };

    const info = await transporter.sendMail(mailOptions);

    console.log("Email sent:", info.messageId);

    return {
      statusCode: 200,
      body: "Email sent",
    };
  } catch (error) {
    console.error("EMAIL ERROR:", error);

    return {
      statusCode: 500,
      body: "Email failed",
    };
  }
}
