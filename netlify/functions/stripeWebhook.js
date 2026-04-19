import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-08-16",
});

// 🔥 ADMIN ACCESS TO SUPABASE
const supabase = createClient(
  "https://jrmqdojsxjtkjpczaysp.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
      body: `Webhook Error: ${err.message}`,
    };
  }

  // ✅ PAYMENT SUCCESS
  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;

    const email = session.customer_email;
    const plan = session.metadata?.plan || "starter";

    console.log("💰 PAYMENT SUCCESS:", email, plan);

    // 🔥 UPDATE USER IN SUPABASE
    const { error } = await supabase
      .from("users")
      .update({
        subscription_status: "active",
        plan: plan,
      })
      .eq("email", email);

    if (error) {
      console.error("❌ Supabase update failed:", error);
    } else {
      console.log("✅ User updated successfully");
    }
  }

  return {
    statusCode: 200,
    body: "Webhook received",
  };
}
