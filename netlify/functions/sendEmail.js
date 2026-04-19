import nodemailer from "nodemailer";

export async function handler(event, context) {
  try {
    console.log("Function started");

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"PropAI" <${process.env.GMAIL_USER}>`,
      to: "airealty.agency26@gmail.com",
      subject: "TEST EMAIL",
      text: "Your email system is working ✅",
    });

    console.log("Email sent:", info.messageId);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Email sent" }),
    };
  } catch (error) {
    console.error("EMAIL ERROR:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}
