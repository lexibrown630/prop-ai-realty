const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    const { email } = JSON.parse(event.body || "{}");

    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing email" }),
      };
    }

    // 🔍 FIND CUSTOMER IN STRIPE
    const customers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    const customer = customers.data[0];

    if (!customer) {
      console.log("❌ No Stripe customer found for:", email);

      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Customer not found" }),
      };
    }

    // 🔥 CREATE BILLING PORTAL SESSION
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: "https://prop-ai-realty.netlify.app/index.html",
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };

  } catch (err) {
    console.error("PORTAL ERROR:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
