import Stripe from "stripe";
import nodemailer from "nodemailer";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-08-16",
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

const sendConfirmationEmail = async (toEmail, bookingDetails) => {
  const mailOptions = {
    from: `"PropAI Bookings" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: "Your Booking is Confirmed!",
    text: `Hi!\n\nYour booking is confirmed:\n${bookingDetails}`,
    html: `<p>Hi!</p><p>Your booking is confirmed:</p><pre>${bookingDetails}</pre>`,
  };

  await transporter.sendMail(mailOptions);
};

export async function handler(event) {
  if (event.httpMethod !== "POST") return { statusCode: 405 };

  let stripeEvent;
  try {
    stripeEvent = JSON.parse(event.body);
  } catch (err) {
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;

    // Extract your customer info
    const customerEmail = session.customer_details.email;
    const bookingDetails = `
Booking ID: ${session.id}
Amount: $${session.amount_total / 100}
Date: ${new Date(session.created * 1000).toLocaleString()}
`;

    try {
      await sendConfirmationEmail(customerEmail, bookingDetails);
      console.log("Confirmation email sent to:", customerEmail);
    } catch (err) {
      console.error("Failed to send email:", err);
    }
  }

  return { statusCode: 200, body: "Webhook received" };
}
