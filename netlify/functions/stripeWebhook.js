import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  let stripeEvent;

  try {
    stripeEvent = JSON.parse(event.body);
  } catch (err) {
    console.error("❌ Invalid JSON:", err);
    return {
      statusCode: 400,
      body: "Invalid JSON",
    };
  }

  // 🔥 HANDLE SUCCESSFUL CHECKOUT
  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;

    // 🔥 SAFELY GET EMAIL
    const email =
      session.customer_email ||
      session.customer_details?.email ||
      "";

    const plan = session.metadata?.plan || "starter";

    console.log("💰 PAYMENT SUCCESS:", email, plan);

    if (!email) {
      console.error("❌ No email found in session");
      return {
        statusCode: 400,
        body: "No email found",
      };
    }

    // 🔥 CLEAN EMAIL (FIXES MATCH ISSUES)
    const cleanEmail = email.trim().toLowerCase();

    try {
      // 🔥 UPDATE SUPABASE USER
      const res = await fetch(
        `https://jrmqdojsxjtkjpczaysp.supabase.co/rest/v1/users?email=eq.${cleanEmail}`,
        {
          method: "PATCH",
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
            Prefer: "return=representation", // 🔥 returns updated rows
          },
          body: JSON.stringify({
            subscription_status: "active",
            plan: plan,
          }),
        }
      );

      const data = await res.json();

      console.log("🧾 Supabase updated rows:", data);

      // 🚨 IF NO ROW UPDATED → USER DOESN’T EXIST → CREATE IT
      if (!data || data.length === 0) {
        console.log("⚠️ No user found, creating new user...");

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
      console.error("❌ Supabase update error:", err);
    }
  }

  return {
    statusCode: 200,
    body: "Webhook received",
  };
}
