const OpenAI = require("openai");
const { createClient } = require("@supabase/supabase-js");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* 🔒 ADMIN SUPABASE (SERVER ONLY) */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event) => {
  if (!process.env.OPENAI_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing OPENAI_API_KEY" }),
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    /* 🔐 AUTH CHECK */
    const authHeader = event.headers.authorization || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Unauthorized" }),
      };
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Invalid user" }),
      };
    }

    /* 📥 INPUT */
    const { message, type } = JSON.parse(event.body || "{}");

    if (!message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing message" }),
      };
    }

    /* 📊 GET USER DATA */
    const { data: dbUser, error: dbError } = await supabase
      .from("users")
      .select("plan, usage_count")
      .eq("id", user.id)
      .single();

    if (dbError || !dbUser) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "User data not found" }),
      };
    }

    let { plan, usage_count } = dbUser;

    /* 🎯 PLAN LIMITS */
    let limit = 10;
    if (plan === "pro") limit = 100;
    if (plan === "agency") limit = 999999;

    /* 🚫 USAGE LIMIT */
    if (usage_count >= limit) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "Usage limit reached" }),
      };
    }

    /* 🚫 FEATURE LOCK */
    if (plan === "starter" && type === "listing") {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "Upgrade to Pro for listings" }),
      };
    }

    /* 🧠 PROMPT LOGIC */
    let systemPrompt = "";
    let userPrompt = message;

    if (type === "listing") {
      systemPrompt =
        "You are a real estate copywriter. Write compelling, high-end property listings.";
      userPrompt = `Create a real estate listing:\n${message}`;
    } else if (type === "followup") {
      systemPrompt =
        "You are a real estate agent following up with leads. Be friendly, natural, and persuasive.";
      userPrompt = `Write a follow-up message:\n${message}`;
    } else {
      systemPrompt =
        "You are a helpful real estate assistant focused on booking showings.";
    }

    /* 🤖 OPENAI CALL */
    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const reply = response.choices[0].message.content;

    /* ➕ INCREMENT USAGE (ATOMIC SAFE ENOUGH FOR MVP) */
    await supabase
      .from("users")
      .update({ usage_count: usage_count + 1 })
      .eq("id", user.id);

    return {
      statusCode: 200,
      body: JSON.stringify({ reply }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
