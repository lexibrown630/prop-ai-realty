import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const sig = event.headers["stripe-signature"];

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Webhook signature failed:", err.message);
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }

  // ✅ CHECKOUT SUCCESS
  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;

    const email =
      session.customer_email ||
      session.customer_details?.email ||
      "";

    const plan = session.metadata?.plan || "starter";
    const customerId = session.customer;

    console.log("💰 PAYMENT SUCCESS:", email, plan);

    if (!email) {
      console.error("❌ No email found");
      return { statusCode: 400, body: "Missing email" };
    }

    const cleanEmail = email.trim().toLowerCase();

    try {
      // 🔥 TRY UPDATE
      const res = await fetch(
        `https://jrmqdojsxjtkjpczaysp.supabase.co/rest/v1/users?email=eq.${cleanEmail}`,
        {
          method: "PATCH",
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            subscription_status: "active",
            plan: plan,
            stripe_customer_id: customerId,
          }),
        }
      );

      const data = await res.json();

      console.log("🧾 Updated rows:", data);

      // 🔥 IF USER DOESN'T EXIST → CREATE
      if (!data || data.length === 0) {
        console.log("⚠️ Creating new user...");

        const createRes = await fetch(
          "https://jrmqdojsxjtkjpczaysp.supabase.co/rest/v1/users",
          {
            method: "POST",
            headers: {
              apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
              "Content-Type": "application/json",
              Prefer: "return=representation",
            },
            body: JSON.stringify({
              email: cleanEmail,
              subscription_status: "active",
              plan: plan,
              stripe_customer_id: customerId,
            }),
          }
        );

        const newUser = await createRes.json();
        console.log("🆕 Created user:", newUser);
      }

    } catch (err) {
      console.error("❌ Supabase error:", err);
    }
  }

  return {
    statusCode: 200,
    body: "Webhook received",
  };
}
