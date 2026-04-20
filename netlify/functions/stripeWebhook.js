import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

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
    console.error("❌ Signature verification failed:", err.message);
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }

  /* ==============================
     ✅ CHECKOUT SUCCESS
  ============================== */
  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;

    const email =
      session.customer_email ||
      session.customer_details?.email ||
      "";

    const plan = session.metadata?.plan || "starter";
    const customerId = session.customer; // 🔥 IMPORTANT

    console.log("💰 PAYMENT SUCCESS:", email, plan, customerId);

    if (!email) {
      return { statusCode: 400, body: "No email found" };
    }

    const cleanEmail = email.trim().toLowerCase();

    try {
      // 🔥 UPDATE EXISTING USER
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
            stripe_customer_id: customerId, // 🔥 SAVE THIS
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
              stripe_customer_id: customerId, // 🔥 SAVE HERE TOO
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

  /* ==============================
     🔻 SUBSCRIPTION UPDATED / CANCELED
  ============================== */
  if (
    stripeEvent.type === "customer.subscription.updated" ||
    stripeEvent.type === "customer.subscription.deleted"
  ) {
    const subscription = stripeEvent.data.object;

    const customerId = subscription.customer;
    const status = subscription.status;
    const cancelAtPeriodEnd = subscription.cancel_at_period_end;

    console.log("🔄 SUB UPDATE:", customerId, status, cancelAtPeriodEnd);

    try {
      // 🔥 FIND USER BY STRIPE CUSTOMER ID
      const res = await fetch(
        `https://jrmqdojsxjtkjpczaysp.supabase.co/rest/v1/users?stripe_customer_id=eq.${customerId}`,
        {
          method: "GET",
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      );

      const users = await res.json();

      if (!users || users.length === 0) {
        console.error("❌ No user found for customer:", customerId);
        return { statusCode: 200 };
      }

      const user = users[0];

      // 🔥 DETERMINE NEW STATUS
      let newStatus = "inactive";

      if (status === "active" && !cancelAtPeriodEnd) {
        newStatus = "active";
      }

      if (cancelAtPeriodEnd) {
        newStatus = "canceling"; // still active until period ends
      }

      if (status === "canceled" || status === "unpaid") {
        newStatus = "inactive";
      }

      // 🔥 UPDATE USER
      await fetch(
        `https://jrmqdojsxjtkjpczaysp.supabase.co/rest/v1/users?id=eq.${user.id}`,
        {
          method: "PATCH",
          headers: {
            apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subscription_status: newStatus,
          }),
        }
      );

      console.log("✅ Updated subscription status →", newStatus);

    } catch (err) {
      console.error("❌ Subscription update error:", err);
    }
  }

  return {
    statusCode: 200,
    body: "OK",
  };
}
