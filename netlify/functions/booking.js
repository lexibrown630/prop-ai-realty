const { google } = require("googleapis");

const AGENT_CALENDARS = {
  agent_1: "50c6100b59b98f15d357622284b567ff017f80155c91097b22c4e9cebb520e8d@group.calendar.google.com",
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const {
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      GOOGLE_PRIVATE_KEY,
      GOOGLE_CALENDAR_ID,
    } = process.env;

    const body = JSON.parse(event.body || "{}");
    const { title, startTime, endTime, description } = body;

    if (!startTime || !endTime) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing start or end time" }),
      };
    }

    const auth = new google.auth.JWT(
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      ["https://www.googleapis.com/auth/calendar"]
    );

    const calendar = google.calendar({ version: "v3", auth });

    const response = await calendar.events.insert({
      calendarId: GOOGLE_CALENDAR_ID,
      requestBody: {
        summary: title || "Property Showing",
        description: description || "Booked via PropAI",
        start: { dateTime: startTime },
        end: { dateTime: endTime },
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        eventId: response.data.id,
        htmlLink: response.data.htmlLink,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
