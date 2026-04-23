const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.handler = async (event) => {
  try {
    /* =========================
       🔐 BASIC CHECKS
    ========================= */
    if (!process.env.OPENAI_API_KEY) {
      return res(500, "Missing OpenAI API key");
    }

    if (event.httpMethod !== "POST") {
      return res(405, "Method Not Allowed");
    }

    /* =========================
       📥 SAFE BODY PARSE
    ========================= */
    let body = {};

    try {
      body = JSON.parse(event.body || "{}");
    } catch (err) {
      return res(400, "Invalid JSON body");
    }

    const message = body.message?.trim();
    const type = body.type || "chat";

    if (!message) {
      return res(400, "Missing message");
    }

    /* =========================
       🤖 PROMPT LOGIC
    ========================= */
    let systemPrompt = "";
    let userPrompt = message;

    if (type === "listing") {
      systemPrompt =
        "You are a high-end real estate copywriter. Write compelling, emotional, MLS-ready property listings.";

      userPrompt = `
Create a professional MLS listing:

${message}

Make it:
- Engaging
- Persuasive
- Easy to read
- Well formatted
      `;
    } 
    
    else if (type === "followup") {
      systemPrompt =
        "You are a top-performing real estate agent following up with leads.";

      userPrompt = `
Create follow-up messages for this lead:

${message}

Return EXACTLY in this format:

EMAIL:
<email here>

SMS:
<short sms under 160 characters>
      `;
    } 
    
    else {
      systemPrompt =
        "You are a helpful real estate assistant helping users book showings.";
    }

    /* =========================
       🤖 OPENAI CALL (SAFE)
    ========================= */
    let aiResponse;

    try {
      aiResponse = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
    } catch (err) {
      console.error("❌ OpenAI API Error:", err);
      return res(500, "AI request failed");
    }

    const reply =
      aiResponse?.choices?.[0]?.message?.content?.trim() ||
      "No response generated";

    /* =========================
       🧠 FORCE CLEAN FORMAT (FOLLOWUP ONLY)
    ========================= */
    if (type === "followup") {
      let email = "";
      let sms = "";

      if (reply.includes("SMS:")) {
        email = reply.split("SMS:")[0].replace("EMAIL:", "").trim();
        sms = reply.split("SMS:")[1].trim();
      } else {
        // fallback if AI messes up format
        email = reply;
        sms = "Follow-up message not clearly separated.";
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          reply,
          email,
          sms,
        }),
      };
    }

    /* =========================
       ✅ NORMAL RESPONSE
    ========================= */
    return {
      statusCode: 200,
      body: JSON.stringify({ reply }),
    };

  } catch (error) {
    console.error("❌ CHAT CRASH:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || "Server crashed",
      }),
    };
  }
};

/* =========================
   🔧 HELPER RESPONSE
========================= */
function res(code, msg) {
  return {
    statusCode: code,
    body: JSON.stringify({ error: msg }),
  };
}
