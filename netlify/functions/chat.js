const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.handler = async (event) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing OpenAI key" }),
      };
    }

    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method Not Allowed" }),
      };
    }

    /* =========================
       📥 GET REQUEST DATA
    ========================= */
    let body;

    try {
      body = JSON.parse(event.body || "{}");
    } catch (e) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid JSON body" }),
      };
    }

    const { message, type } = body;

    if (!message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing message" }),
      };
    }

    /* =========================
       🤖 PROMPT LOGIC
    ========================= */
    let systemPrompt = "";
    let userPrompt = message;

    if (type === "listing") {
      systemPrompt =
        "You are a high-end real estate copywriter. Write compelling, emotional, MLS-ready property listings that sell.";

      userPrompt = `
Create a professional MLS listing.

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
        "You are a top-performing real estate agent following up with leads to convert them into clients.";

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
        "You are a helpful real estate assistant helping users book showings and answer property questions.";
    }

    /* =========================
       🤖 OPENAI CALL
    ========================= */
    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const reply = response.choices[0].message.content;

    return {
      statusCode: 200,
      body: JSON.stringify({ reply }),
    };

  } catch (error) {
    console.error("❌ CHAT ERROR:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message || "Server error",
      }),
    };
  }
};
