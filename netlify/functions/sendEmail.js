import nodemailer from "nodemailer";

export async function handler() {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: "airealty.agency26@gmail.com",
      subject: "TEST EMAIL",
      text: "Your email system is working ✅",
    });

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