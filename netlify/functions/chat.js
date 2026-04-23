const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method Not Allowed" }),
      };
    }

    const { message, type } = JSON.parse(event.body || "{}");

    if (!message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing message" }),
      };
    }

    let systemPrompt = "";
    let userPrompt = message;

    if (type === "followup") {
      systemPrompt =
        "You are a real estate agent creating high-converting follow-ups.";

      userPrompt = `
Create a follow-up for this lead:

${message}

Return ONLY valid JSON in this format:
{
  "email": "...",
  "sms": "..."
}
`;
    } 
    
    else if (type === "listing") {
      systemPrompt =
        "You are a real estate copywriter writing MLS listings.";

      userPrompt = `
${message}

Return ONLY the listing text. No JSON.
`;
    } 
    
    else {
      systemPrompt =
        "You are a helpful real estate assistant.";
    }

    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    let reply = response.choices[0].message.content;

    // 🧠 Parse JSON safely for follow-ups
    if (type === "followup") {
      try {
        const parsed = JSON.parse(reply);

        return {
          statusCode: 200,
          body: JSON.stringify({
            email: parsed.email,
            sms: parsed.sms,
          }),
        };
      } catch (e) {
        return {
          statusCode: 500,
          body: JSON.stringify({
            error: "AI response formatting failed",
          }),
        };
      }
    }

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
