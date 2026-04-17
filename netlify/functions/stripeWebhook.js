// netlify/functions/stripeWebhook.js
import Stripe from "stripe";
import { buffer } from "micro";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-08-16",
});

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const sig = event.headers["stripe-signature"];
  const buf = await buffer(event);
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      buf.toString(),
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // Handle event types
  switch (stripeEvent.type) {
    case "checkout.session.completed":
      const session = stripeEvent.data.object;
      console.log("Checkout session completed:", session);
      break;
    default:
      console.log(`Unhandled event type: ${stripeEvent.type}`);
  }

  return { statusCode: 200, body: "Webhook received" };
};
