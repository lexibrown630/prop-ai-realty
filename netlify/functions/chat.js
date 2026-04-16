const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.handler = async (event) => {
  if (!process.env.OPENAI_API_KEY) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Missing OPENAI_API_KEY" }),
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const { message, type } = JSON.parse(event.body || "{}");

    if (!message) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Missing message" }),
      };
    }

    // -------------------------------
    // PROMPT LOGIC (FIXED)
    // -------------------------------
    let systemPrompt = "";
    let userPrompt = message;

    if (type === "listing") {
      systemPrompt =
        "You are a real estate copywriter. Write detailed, compelling, high-end property listings that highlight features, lifestyle, and urgency.";

      userPrompt = `Create a real estate listing based on this:
${message}

Make it engaging, well-structured, and persuasive.`;
    } 
    else if (type === "followup") {
      systemPrompt =
        "You are a real estate agent following up with leads. Be friendly, natural, and persuasive without sounding pushy.";

      userPrompt = `Write a follow-up message for this situation:
${message}

Keep it conversational and professional.`;
    } 
    else {
      systemPrompt =
        "You are Alex, a helpful real estate assistant focused on booking showings and answering questions.";
    }

    // -------------------------------
    // OPENAI CALL (ONLY ONCE)
    // -------------------------------
    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    // -------------------------------
    // SUCCESS RESPONSE
    // -------------------------------
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reply: response.choices[0].message.content,
      }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: error.message || "Server error",
      }),
    };
  }
};
