const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
try {
if (event.httpMethod !== "POST") {
return {
statusCode: 405,
body: JSON.stringify({ error: "Method not allowed" }),
};
}

```
const { priceId, email } = JSON.parse(event.body || "{}");

if (!priceId || !email) {
  return {
    statusCode: 400,
    body: JSON.stringify({ error: "Missing priceId or email" }),
  };
}

// 🔥 MAP PRICE → PLAN
let plan = "Main";

if (priceId === "price_1TP9DMRqy7IFyseNPEDk3coa") plan = "Startup Fee";
else if (priceId === "price_1TP9BERqy7IFyseNaZDNaYs2") plan = "Main";
// 🔍 CHECK IF CUSTOMER EXISTS
let customer;

const existingCustomers = await stripe.customers.list({
  email: email,
  limit: 1,
});

if (existingCustomers.data.length > 0) {
  customer = existingCustomers.data[0];
  console.log("👤 Existing customer:", customer.id);
} else {
  customer = await stripe.customers.create({
    email: email,
  });
  console.log("🆕 New customer created:", customer.id);
}

// ✅ CREATE CHECKOUT SESSION
const session = await stripe.checkout.sessions.create({
  mode: "subscription",

  customer: customer.id, // 🔥 KEY FIX

  payment_method_types: ["card"],

  line_items: [
    {
      price: priceId,
      quantity: 1,
    },
  ],

  metadata: {
    plan: plan,
    customer_id: customer.id,
  },

  success_url: "https://prop-ai-realty.netlify.app/index.html?success=true",
  cancel_url: "https://prop-ai-realty.netlify.app/payments.html?canceled=true",
});

if (!session.url) {
  return {
    statusCode: 500,
    body: JSON.stringify({ error: "No checkout URL returned" }),
  };
}

return {
  statusCode: 200,
  body: JSON.stringify({ url: session.url }),
};
```

} catch (err) {
console.error("❌ STRIPE ERROR:", err);

```
return {
  statusCode: 500,
  body: JSON.stringify({
    error: err.message || "Internal server error",
  }),
};
```

}
};
