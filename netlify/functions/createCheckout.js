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

    const { priceId, email } = JSON.parse(event.body || "{}");

    console.log("📥 Incoming:", { priceId, email });

    // 🚨 Validate input
    if (!priceId || !email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing priceId or email" }),
      };
    }

    // 🔥 MAP PRICE → PLAN
    let plan = "starter";

    if (priceId === "price_1TN45MRqy7IFyseNJtzPtgVC") {
      plan = "starter";
    } else if (priceId === "price_1TN46TRqy7IFyseNHEiBa8xe") {
      plan = "pro";
    } else if (priceId === "price_1TN47TRqy7IFyseNqnUSkEoO") {
      plan = "agency";
    }

    console.log("🧠 Plan selected:", plan);

    // ✅ CREATE CHECKOUT SESSION
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],

      customer_email: email,

      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

      // 🔥 THIS IS IMPORTANT FOR WEBHOOK
      metadata: {
        plan: plan,
      },

      success_url: "https://prop-ai-realty.netlify.app/index.html?success=true",
      cancel_url: "https://prop-ai-realty.netlify.app/src/payments.html?canceled=true",
    });

    console.log("✅ Session created:", session.id);
    console.log("🔗 Checkout URL:", session.url);

    // 🚨 SAFETY CHECK
    if (!session.url) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "No checkout URL returned from Stripe" }),
      };
    }

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
