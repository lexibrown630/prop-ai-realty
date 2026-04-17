const { google } = require("googleapis");

/**
 * 🧠 MULTI-AGENT CALENDAR MAP
 * Add each agent/company calendar here
 * Make sure EACH calendar is shared with your service account
 */
const AGENT_CALENDARS = {
  agent_1: "agent1@group.calendar.google.com",
  agent_2: "agent2@group.calendar.google.com",
  company_1: "company1@group.calendar.google.com",
};

exports.handler = async (event) => {
  // Only allow POST
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

    // Validate environment variables
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

    // Parse request body
    const body = JSON.parse(event.body || "{}");

    const {
      title,
      startTime,
      endTime,
      description,
      agentId,
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

    // Validate agentId if provided
    if (agentId && !AGENT_CALENDARS[agentId]) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Invalid agentId",
        }),
      };
    }

    // Choose correct calendar
    const calendarId =
      (agentId && AGENT_CALENDARS[agentId]) || GOOGLE_CALENDAR_ID;

    // Authenticate with Google
    const auth = new google.auth.JWT(
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      ["https://www.googleapis.com/auth/calendar"]
    );

    const calendar = google.calendar({ version: "v3", auth });

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
        agentId: agentId || "default",
        calendarUsed: calendarId,
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
