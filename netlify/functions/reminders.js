const { google } = require("googleapis");

const AGENT_CALENDARS = {
  agent_1:
    "50c6100b59b98f15d357622284b567ff017f80155c91097b22c4e9cebb520e8d@group.calendar.google.com",
};

function makeAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;

  const privateKey = key.includes("\\n")
    ? key.replace(/\\n/g, "\n")
    : key;

  return new google.auth.JWT(email, null, privateKey, [
    "https://www.googleapis.com/auth/calendar",
  ]);
}

function hoursDiff(future, now) {
  return (new Date(future) - new Date(now)) / (1000 * 60 * 60);
}

exports.handler = async () => {
  try {
    const auth = makeAuth();
    const calendar = google.calendar({ version: "v3", auth });

    const calendarId = AGENT_CALENDARS.agent_1;

    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + 2);

    const events = await calendar.events.list({
      calendarId,
      timeMin: now.toISOString(),
      timeMax: future.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const items = events.data.items || [];

    for (const event of items) {
      if (!event.start?.dateTime) continue;

      const start = new Date(event.start.dateTime);
      const diff = hoursDiff(start, now);

      const desc = event.description || "";

      // skip if already sent
      const sent24 = desc.includes("REMINDER_24");
      const sent1 = desc.includes("REMINDER_1");

      const email = event.attendees?.[0]?.email;

      if (!email) continue;

      // ======================
      // 24 HOUR REMINDER
      // ======================
      if (diff <= 24.5 && diff >= 23.5 && !sent24) {
        console.log("Send 24h reminder to:", email);

        await markSent(calendar, calendarId, event, "REMINDER_24");
      }

      // ======================
      // 1 HOUR REMINDER
      // ======================
      if (diff <= 1.5 && diff >= 0.5 && !sent1) {
        console.log("Send 1h reminder to:", email);

        await markSent(calendar, calendarId, event, "REMINDER_1");
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};

async function markSent(calendar, calendarId, event, tag) {
  await calendar.events.patch({
    calendarId,
    eventId: event.id,
    requestBody: {
      description: `${event.description || ""}\n${tag}`,
    },
  });
}
