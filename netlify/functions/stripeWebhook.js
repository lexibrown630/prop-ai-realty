import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405 };
  }

  let stripeEvent;

  try {
    stripeEvent = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      body: "Invalid JSON",
    };
  }

  // 🔥 ONLY HANDLE SUCCESSFUL PAYMENTS
  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;

    const email = session.customer_email;
    const plan = session.metadata.plan;

    console.log("💰 PAYMENT SUCCESS:", email, plan);

    // 🔥 UPDATE SUPABASE
    const res = await fetch(
      "https://jrmqdojsxjtkjpczaysp.supabase.co/rest/v1/users?email=eq." + email,
      {
        method: "PATCH",
        headers: {
          apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscription_status: "active",
          plan: plan,
        }),
      }
    );

    const text = await res.text();

    console.log("🧾 Supabase response:", text);
  }

  return {
    statusCode: 200,
    body: "Webhook received",
  };
}
