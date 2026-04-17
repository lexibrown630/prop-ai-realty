const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");

    const session = body.data?.object;

    if (!session?.customer_email) {
      return { statusCode: 200, body: "No email" };
    }

    const email = session.customer_email;

    // mark user as active
    await supabase.from("users").upsert({
      email,
      subscription_status: "active",
      stripe_customer_id: session.customer,
    });

    return {
      statusCode: 200,
      body: "Webhook processed",
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: err.message,
    };
  }
};
