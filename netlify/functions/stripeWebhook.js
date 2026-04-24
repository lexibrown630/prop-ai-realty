import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

/* 🔥 PLAN MAPPING */
function getPlanFromPrice(priceId) {
  if (priceId === "price_1TP9BERqy7IFyseNaZDNaYs2") return "main"; // 👈 monthly ONLY
  return "starter";
}

const SUPABASE_URL = "https://jrmqdojsxjtkjpczaysp.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/* 🔥 UPSERT USER (CREATE OR UPDATE) */
async function upsertUser(data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates", // 🔥 THIS IS KEY
    },
    body: JSON.stringify(data),
  });

  const text = await res.text();

  if (!res.ok) {
    console.error("❌ Supabase error:", text);
  } else {
    console.log("✅ Supabase updated:", data.email || data.stripe_customer_id);
  }
}

/* ==============================
MAIN HANDLER
============================== */
export async function handler(event) {
  const sig = event.headers["stripe-signature"];

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Signature failed:", err.message);
    return { statusCode: 400, body: err.message };
  }

  /* ==============================
  💰 CHECKOUT SUCCESS
  ============================== */
  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;

    const email =
      session.customer_email ||
      session.customer_details?.email ||
      "";

    const customerId = session.customer;
    const plan = session.metadata?.plan || "starter";

    const cleanEmail = email.trim().toLowerCase();

    console.log("💰 PAYMENT:", cleanEmail, plan);

    await upsertUser({
      email: cleanEmail,
      stripe_customer_id: customerId,
      subscription_status: "active",
      plan: plan,
    });
  }

  /* ==============================
  🔄 SUBSCRIPTION UPDATE
  ============================== */
  if (
    stripeEvent.type === "customer.subscription.updated" ||
    stripeEvent.type === "customer.subscription.deleted"
  ) {
    const sub = stripeEvent.data.object;

    const customerId = sub.customer;
    const status = sub.status;
    const cancelAtPeriodEnd = sub.cancel_at_period_end;

    const priceId = sub.items.data[0]?.price?.id;
    const plan = getPlanFromPrice(priceId);

    let newStatus = "inactive";

    if (status === "active" && !cancelAtPeriodEnd) {
      newStatus = "active";
    }

    if (cancelAtPeriodEnd) {
      newStatus = "canceling";
    }

    if (status === "canceled" || status === "unpaid") {
      newStatus = "inactive";
    }

    console.log("🔄 SUB UPDATE:", customerId, plan, newStatus);

    await upsertUser({
      stripe_customer_id: customerId,
      subscription_status: newStatus,
      plan: newStatus === "inactive" ? "starter" : plan,
    });
  }

  return {
    statusCode: 200,
    body: "OK",
  };
}
