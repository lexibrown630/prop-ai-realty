const OpenAI = require("openai");

const client = new OpenAI({
apiKey: process.env.OPENAI_API_KEY,
});

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/* 🔥 PLAN LIMITS */
function getLimit(plan) {
if (plan === "starter") return 10;
if (plan === "pro") return 100;
if (plan === "agency") return 999999;
return 10;
}

exports.handler = async (event) => {
try {
if (!process.env.OPENAI_API_KEY) {
return {
statusCode: 500,
body: JSON.stringify({ error: "Missing OpenAI key" }),
};
}

```
if (event.httpMethod !== "POST") {
  return {
    statusCode: 405,
    body: JSON.stringify({ error: "Method Not Allowed" }),
  };
}

/* =========================
   🔐 AUTH CHECK
========================= */
const token = event.headers.authorization?.replace("Bearer ", "");

if (!token) {
  return {
    statusCode: 401,
    body: JSON.stringify({ error: "Unauthorized" }),
  };
}

// 🔥 VERIFY USER WITH SUPABASE
const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
  headers: {
    Authorization: `Bearer ${token}`,
    apikey: process.env.SUPABASE_ANON_KEY,
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

/* =========================
   📊 LOAD USER DATA
========================= */
const dbRes = await fetch(
  `${SUPABASE_URL}/rest/v1/users?email=eq.${email}`,
  {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  }
);

const users = await dbRes.json();
const user = users[0];

if (!user) {
  return {
    statusCode: 404,
    body: JSON.stringify({ error: "User not found" }),
  };
}

const plan = user.plan || "starter";
const usage = user.usage_count || 0;
const limit = getLimit(plan);

/* =========================
   🚫 ENFORCE LIMIT
========================= */
if (usage >= limit) {
  return {
    statusCode: 403,
    body: JSON.stringify({
      error: "Usage limit reached",
      plan,
      usage,
      limit,
    }),
  };
}

/* =========================
   🤖 HANDLE AI
========================= */
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
  if (plan === "starter") {
    return {
      statusCode: 403,
      body: JSON.stringify({
        error: "Upgrade required for listings",
      }),
    };
  }

  systemPrompt =
    "You are a real estate copywriter. Write compelling, high-end property listings.";

  userPrompt = `Create a real estate listing:\n${message}`;
} 
else if (type === "followup") {
  systemPrompt =
    "You are a real estate agent following up with leads. Be friendly and persuasive.";

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

const reply = response.choices[0].message.content;

/* =========================
   📈 INCREMENT USAGE
========================= */
await fetch(
  `${SUPABASE_URL}/rest/v1/users?id=eq.${user.id}`,
  {
    method: "PATCH",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      usage_count: usage + 1,
    }),
  }
);

return {
  statusCode: 200,
  body: JSON.stringify({ reply }),
};
```

} catch (error) {
console.error("❌ CHAT ERROR:", error);

```
return {
  statusCode: 500,
  body: JSON.stringify({ error: error.message }),
};
```

}
};
