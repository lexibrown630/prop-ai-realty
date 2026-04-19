import nodemailer from "nodemailer";

// Environment variables (set in Netlify)
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_PASS = process.env.GMAIL_PASS;

// Main Netlify function handler
export async function handler(event) {
  try {
    // Only allow POST requests
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method Not Allowed" }),
      };
    }

    // Parse request body
    const { toEmail, bookingDetails } = JSON.parse(event.body);

    if (!toEmail) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing email" }),
      };
    }

    // Create transporter (Gmail)
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS,
      },
    });

    // Email content (optimized for deliverability)
    const mailOptions = {
      from: GMAIL_USER,
      to: toEmail,
      subject: "PropAI Booking Confirmation",

      text: `
Hello,

This is a confirmation of your request with PropAI Realty.

Details:
${bookingDetails || "No additional details provided."}

If you did not request this, you can ignore this email.

— PropAI Realty
      `,

      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.5;">
          <h2>PropAI Realty</h2>

          <p>This is a confirmation of your request.</p>

          <p><strong>Details:</strong></p>
          <pre style="background:#f4f4f4;padding:10px;border-radius:5px;">
${bookingDetails || "No additional details provided."}
          </pre>

          <p>If you did not request this, you can ignore this email.</p>

          <p>— PropAI Realty</p>
        </div>
      `,
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);

    console.log("Email sent:", info.messageId);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Email sent" }),
    };

  } catch (error) {
    console.error("Error sending email:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to send email" }),
    };
  }
}
