const { google } = require("googleapis");

const BUFFER_MINUTES = 20; // travel / reset time

const AGENT_CALENDARS = {
  agent_1: "50c6100b59b98f15d357622284b567ff017f80155c91097b22c4e9cebb520e8d@group.calendar.google.com",
};

function addMinutes(date, mins) {
  return new Date(new Date(date).getTime() + mins * 60000);
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd);
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    const {
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      GOOGLE_PRIVATE_KEY,
      GOOGLE_CALENDAR_ID,
    } = process.env;

    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_CALENDAR_ID) {
      return { statusCode: 500, body: JSON.stringify({ error: "Missing env vars" }) };
    }

    const body = JSON.parse(event.body || "{}");
    const { action = "book", title, startTime, endTime, agentId, eventId } = body;

    const calendarId = (agentId && AGENT_CALENDARS[agentId]) || GOOGLE_CALENDAR_ID;

    const auth = new google.auth.JWT(
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      ["https://www.googleapis.com/auth/calendar"]
    );

    const calendar = google.calendar({ version: "v3", auth });

    // =========================
    // 1. FETCH EVENTS (for conflict detection)
    // =========================
    const timeMin = new Date(new Date(startTime).getTime() - BUFFER_MINUTES * 60000).toISOString();
    const timeMax = new Date(new Date(endTime).getTime() + BUFFER_MINUTES * 60000).toISOString();

    const events = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      singleEvents: true,
    });

    const items = events.data.items || [];

    // =========================
    // ACTION: BOOK
    // =========================
    if (action === "book") {
      const conflict = items.find(ev =>
        ev.start?.dateTime &&
        ev.end?.dateTime &&
        overlaps(startTime, endTime, ev.start.dateTime, ev.end.dateTime)
      );

      if (conflict) {
        return {
          statusCode: 200,
          body: JSON.stringify({
            success: false,
            error: "This time slot is already booked",
          }),
        };
      }

      const response = await calendar.events.insert({
        calendarId,
        requestBody: {
          summary: title || "Property Showing",
          description: "Booked via PropAI",
          start: { dateTime: startTime },
          end: { dateTime: endTime },
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
    }

    // =========================
    // ACTION: CANCEL
    // =========================
    if (action === "cancel") {
      if (!eventId) {
        return { statusCode: 400, body: JSON.stringify({ error: "Missing eventId" }) };
      }

      await calendar.events.delete({
        calendarId,
        eventId,
      });

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, message: "Booking cancelled" }),
      };
    }

    // =========================
    // ACTION: RESCHEDULE
    // =========================
    if (action === "reschedule") {
      if (!eventId) {
        return { statusCode: 400, body: JSON.stringify({ error: "Missing eventId" }) };
      }

      const updated = await calendar.events.patch({
        calendarId,
        eventId,
        requestBody: {
          start: { dateTime: startTime },
          end: { dateTime: endTime },
        },
      });

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: "Rescheduled",
          eventId: updated.data.id,
        }),
      };
    }

    // =========================
    // ACTION: SUGGEST SLOTS
    // =========================
    if (action === "suggest") {
      const base = new Date(startTime);
      const suggestions = [];

      for (let i = 0; i < 5; i++) {
        const start = addMinutes(base, i * 60);
        const end = addMinutes(start, 30);

        const conflict = items.find(ev =>
          ev.start?.dateTime &&
          ev.end?.dateTime &&
          overlaps(start, end, ev.start.dateTime, ev.end.dateTime)
        );

        if (!conflict) {
          suggestions.push({
            start: start.toISOString(),
            end: end.toISOString(),
          });
        }
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          suggestions,
        }),
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid action" }),
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
