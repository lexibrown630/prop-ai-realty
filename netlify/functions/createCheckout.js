const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    // ✅ Only allow POST
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method not allowed" }),
      };
    }

    // ✅ Parse request
    const { email, userId } = JSON.parse(event.body || "{}");

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing email" }),
      };
    }

    // 🔍 Check if customer exists
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

      customer: customer.id,

      payment_method_types: ["card"],

      line_items: [
        {
          price: "price_XXXXXXXXXXXX", // 🔥 REPLACE with $50 startup fee price ID
          quantity: 1,
        },
        {
          price: "price_YYYYYYYYYYYY", // 🔥 REPLACE with $100/month price ID
          quantity: 1,
        },
      ],

      metadata: {
        user_id: userId,
      },

      success_url: "https://prop-ai-realty.netlify.app/index.html?success=true",
      cancel_url: "https://prop-ai-realty.netlify.app/payments.html?canceled=true",
    });

    // 🚨 Safety check
    if (!session.url) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "No checkout URL returned from Stripe" }),
      };
    }

    // ✅ Return URL
    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };

  } catch (err) {
    console.error("❌ STRIPE ERROR:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err.message || "Internal server error",
      }),
    };
  }
};
