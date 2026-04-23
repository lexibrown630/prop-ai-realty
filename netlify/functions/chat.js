const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return response(405, "Method not allowed");
    }

    let body = {};
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return response(400, "Invalid JSON");
    }

    const message = body.message?.trim();
    const type = body.type || "chat";

    if (!message) {
      return response(400, "Missing message");
    }

    let systemPrompt = "You are a helpful real estate assistant.";

    if (type === "listing") {
      systemPrompt = "Write high-converting MLS listings.";
    }

    if (type === "followup") {
      systemPrompt = "Write follow-up emails and SMS.";
    }

    let ai;

    try {
      ai = await client.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
      });
    } catch (err) {
      console.error(err);
      return response(500, "AI failed");
    }

    const reply = ai?.choices?.[0]?.message?.content || "No reply";

    return {
      statusCode: 200,
      body: JSON.stringify({ reply }),
    };

  } catch (err) {
    console.error(err);
    return response(500, "Server crash");
  }
};

function response(code, msg) {
  return {
    statusCode: code,
    body: JSON.stringify({ error: msg }),
  };
}
