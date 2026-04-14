const { OpenAI } = require("openai");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  try {
    const { message } = JSON.parse(event.body);
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "system", content: "You are a real estate assistant named Alex." }, { role: "user", content: message }],
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ reply: response.choices[0].message.content }),
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};