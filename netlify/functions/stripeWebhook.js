import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
apiVersion: "2023-10-16",
});

/* 🔥 MAP STRIPE PRICE → PLAN */
function getPlanFromPrice(priceId) {
if (priceId === "price_1TN45MRqy7IFyseNJtzPtgVC") return "starter";
if (priceId === "price_1TN46TRqy7IFyseNHEiBa8xe") return "pro";
if (priceId === "price_1TN47TRqy7IFyseNqnUSkEoO") return "agency";
return "starter";
}

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

```
const email =
  session.customer_email ||
  session.customer_details?.email ||
  "";

const customerId = session.customer;
const plan = session.metadata?.plan || "starter";

const cleanEmail = email.trim().toLowerCase();

console.log("💰 PAYMENT SUCCESS:", cleanEmail, plan);

await fetch(
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
```

}

/* ==============================
🔄 SUBSCRIPTION UPDATED / CANCELED
============================== */
if (
stripeEvent.type === "customer.subscription.updated" ||
stripeEvent.type === "customer.subscription.deleted"
) {
const subscription = stripeEvent.data.object;

```
const customerId = subscription.customer;
const status = subscription.status;
const cancelAtPeriodEnd = subscription.cancel_at_period_end;

// 🔥 GET PLAN FROM STRIPE PRICE
const priceId = subscription.items.data[0]?.price?.id;
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

console.log("🔄 UPDATE:", customerId, plan, newStatus);

await fetch(
  `https://jrmqdojsxjtkjpczaysp.supabase.co/rest/v1/users?stripe_customer_id=eq.${customerId}`,
  {
    method: "PATCH",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subscription_status: newStatus,
      plan: newStatus === "inactive" ? "starter" : plan,
    }),
  }
);
```

}

return {
statusCode: 200,
body: "OK",
};
}
