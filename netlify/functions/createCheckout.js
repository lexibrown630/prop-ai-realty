const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method not allowed" }),
      };
    }

    /* =========================
       🔐 AUTH (FROM HEADER)
    ========================= */
    const token = event.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    // Get user from Supabase
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
      },
    });

    const userData = await userRes.json();

    if (!userData || userData.error) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Invalid user" }),
      };
    }

    const email = userData.email;
    const userId = userData.id;

    /* =========================
       📦 INPUT
    ========================= */
    const { priceId } = JSON.parse(event.body || "{}");

    if (!priceId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing priceId" }),
      };
    }

    /* =========================
       🧠 PLAN MAPPING
    ========================= */
    let plan = "main";

    if (priceId === "price_1TP9DMRqy7IFyseNPEDk3coa") plan = "startup";
    if (priceId === "price_1TP9BERqy7IFyseNaZDNaYs2") plan = "main";

    /* =========================
       👤 GET OR CREATE CUSTOMER
    ========================= */
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
        metadata: {
          supabase_user_id: userId,
        },
      });
      console.log("🆕 Created customer:", customer.id);
    }

    /* =========================
       💳 CREATE CHECKOUT
    ========================= */
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",

      customer: customer.id,

      payment_method_types: ["card"],

      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

      // 🔥 CRITICAL FOR WEBHOOK LINKING
      client_reference_id: userId,

      metadata: {
        plan: plan,
        user_id: userId,
      },

      success_url:
        "https://prop-ai-realty.netlify.app/index.html?success=true",
      cancel_url:
        "https://prop-ai-realty.netlify.app/payments.html?canceled=true",
    });

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
