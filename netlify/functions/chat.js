const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    const { message, type } = JSON.parse(event.body || "{}");

    if (!message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing message" }),
      };
    }

    let systemPrompt = "";
    let userPrompt = message;

    if (type === "listing") {
      systemPrompt =
        "You are a real estate copywriter. Write compelling, high-end property listings.";

      userPrompt = `Create a real estate listing:\n${message}`;
    } 
    else if (type === "followup") {
      systemPrompt =
        "You are a real estate agent following up with leads. Be friendly, natural, and persuasive.";

      userPrompt = `Write a follow-up message:\n${message}`;
    } 
    else {
      systemPrompt =
        "You are a helpful real estate assistant focused on booking showings.";
    }

    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        reply: response.choices[0].message.content,
      }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
