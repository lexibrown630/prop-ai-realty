const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    // Only allow POST
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method not allowed" }),
      };
    }

    const { priceId, email } = JSON.parse(event.body || "{}");

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

      // 🔥 THIS PASSES PLAN TO WEBHOOK
      metadata: {
        plan: plan,
      },

      // ✅ CLEAN SUCCESS FLOW (NO ROUTER)
      success_url: "https://prop-ai-realty.netlify.app/index.html",
      cancel_url: "https://prop-ai-realty.netlify.app/src/payments.html",
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };

  } catch (err) {
    console.log("STRIPE ERROR:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
