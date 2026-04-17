const { google } = require("googleapis");

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    // ENV VARIABLES (your current setup)
    const {
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      GOOGLE_PRIVATE_KEY,
      GOOGLE_CALENDAR_ID,
    } = process.env;

    // Validate env vars
    if (
      !GOOGLE_SERVICE_ACCOUNT_EMAIL ||
      !GOOGLE_PRIVATE_KEY ||
      !GOOGLE_CALENDAR_ID
    ) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Missing Google environment variables",
        }),
      };
    }

    // Parse request body safely
    const body = JSON.parse(event.body || "{}");

    const {
      title,
      startTime,
      endTime,
      description,
      agentEmail, // future multi-agent support
    } = body;

    // Validate required fields
    if (!startTime || !endTime) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "startTime and endTime are required",
        }),
      };
    }

    // Auth with Google
    const auth = new google.auth.JWT(
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      ["https://www.googleapis.com/auth/calendar"]
    );

    const calendar = google.calendar({ version: "v3", auth });

    // Choose calendar (future multi-agent support hook)
    const calendarId = GOOGLE_CALENDAR_ID;

    // Create event
    const response = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: title || "Property Showing",
        description: description || "Booked via PropAI",
        start: {
          dateTime: startTime,
        },
        end: {
          dateTime: endTime,
        },
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: "Booking confirmed",
        eventId: response.data.id,
        htmlLink: response.data.htmlLink,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
      }),
    };
  }
};
