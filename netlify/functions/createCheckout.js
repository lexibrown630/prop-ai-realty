const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method not allowed" }),
      };
    }

    const { email, userId } = JSON.parse(event.body || "{}");

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing email" }),
      };
    }

    // ✅ CLEAN EMAIL (IMPORTANT)
    const cleanEmail = email.trim().toLowerCase();

    // 🔍 CHECK CUSTOMER
    let customer;

    const existingCustomers = await stripe.customers.list({
      email: cleanEmail,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
      console.log("👤 Existing customer:", customer.id);
    } else {
      customer = await stripe.customers.create({
        email: cleanEmail,
      });
      console.log("🆕 New customer created:", customer.id);
    }

    // 💳 CHECKOUT SESSION
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.id,

      payment_method_types: ["card"],

      line_items: [
        {
          price: "price_1TP9DMRqy7IFyseNPEDk3coa", // $50 setup fee
          quantity: 1,
        },
        {
          price: "price_1TP9BERqy7IFyseNaZDNaYs2", // $100/month
          quantity: 1,
        },
      ],

      metadata: {
        user_id: userId,
        email: cleanEmail,
      },

      success_url:
        "https://prop-ai-realty.netlify.app/index.html?success=true",
      cancel_url:
        "https://prop-ai-realty.netlify.app/payments.html?canceled=true",
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
