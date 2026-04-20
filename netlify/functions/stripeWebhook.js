import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export async function handler(event) {
  // 🔥 REQUIRED for Stripe signature verification
  const sig = event.headers["stripe-signature"];

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body, // must be raw body
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Signature verification failed:", err.message);
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }

  /* ==============================
     ✅ CHECKOUT SUCCESS HANDLER
  ============================== */
  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;

    const email =
      session.customer_email ||
      session.customer_details?.email ||
      "";

    const plan = session.metadata?.plan || "starter";

    console.log("💰 PAYMENT SUCCESS:", email, plan);

    if (!email) {
      return {
        statusCode: 400,
        body: "No email found",
      };
    }

    const cleanEmail = email.trim().toLowerCase();

    try {
      // 🔥 UPDATE USER
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
          }),
        }
      );

      const data = await res.json();

      console.log("🧾 Updated rows:", data);

      // 🔥 CREATE USER IF NOT EXISTS
      if (!data || data.length === 0) {
        console.log("⚠️ No user found, creating...");

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
    body: "OK",
  };
}
