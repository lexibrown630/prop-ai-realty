const { google } = require("googleapis");

const AGENT_CALENDARS = {
  agent_1:
    "50c6100b59b98f15d357622284b567ff017f80155c91097b22c4e9cebb520e8d@group.calendar.google.com",
};

const BUFFER_MINUTES = 15;

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

    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_CALENDAR_ID) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing env vars" }),
      };
    }

    const body = JSON.parse(event.body || "{}");

    const {
      action = "book",
      title,
      startTime,
      endTime,
      description,
      agentId,
      eventId,
      newStartTime,
      newEndTime,
      dateRangeStart,
      dateRangeEnd,
    } = body;

    const calendarId =
      (agentId && AGENT_CALENDARS[agentId]) || GOOGLE_CALENDAR_ID;

    const privateKey = GOOGLE_PRIVATE_KEY.includes("\\n")
      ? GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n")
      : GOOGLE_PRIVATE_KEY;

    const auth = new google.auth.JWT(
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      privateKey,
      ["https://www.googleapis.com/auth/calendar"]
    );

    const calendar = google.calendar({ version: "v3", auth });

    // -------------------------------------------------------
    // 🔵 ACTION: BOOK
    // -------------------------------------------------------
    if (action === "book") {
      if (!startTime || !endTime) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Missing time" }),
        };
      }

      const existing = await calendar.events.list({
        calendarId,
        timeMin: startTime,
        timeMax: endTime,
        singleEvents: true,
      });

      if (existing.data.items.length > 0) {
        return {
          statusCode: 409,
          body: JSON.stringify({
            success: false,
            error: "Time slot already booked",
          }),
        };
      }

      const response = await calendar.events.insert({
        calendarId,
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
    }

    // -------------------------------------------------------
    // 🔴 ACTION: CANCEL
    // -------------------------------------------------------
    if (action === "cancel") {
      if (!eventId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Missing eventId" }),
        };
      }

      await calendar.events.delete({
        calendarId,
        eventId,
      });

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: "Booking cancelled",
        }),
      };
    }

    // -------------------------------------------------------
    // 🟡 ACTION: RESCHEDULE
    // -------------------------------------------------------
    if (action === "reschedule") {
      if (!eventId || !newStartTime || !newEndTime) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "Missing eventId or new times",
          }),
        };
      }

      const updated = await calendar.events.patch({
        calendarId,
        eventId,
        requestBody: {
          start: { dateTime: newStartTime },
          end: { dateTime: newEndTime },
        },
      });

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: "Rescheduled successfully",
          eventId: updated.data.id,
        }),
      };
    }

    // -------------------------------------------------------
    // 🟢 ACTION: SUGGEST TIME SLOTS
    // -------------------------------------------------------
    if (action === "suggest") {
      if (!dateRangeStart || !dateRangeEnd) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "Missing date range",
          }),
        };
      }

      const existing = await calendar.events.list({
        calendarId,
        timeMin: dateRangeStart,
        timeMax: dateRangeEnd,
        singleEvents: true,
        orderBy: "startTime",
      });

      const busy = existing.data.items.map((e) => ({
        start: new Date(e.start.dateTime).getTime(),
        end: new Date(e.end.dateTime).getTime(),
      }));

      const slots = [];
      const start = new Date(dateRangeStart).getTime();
      const end = new Date(dateRangeEnd).getTime();

      const SLOT_DURATION = 30 * 60 * 1000;
      const BUFFER = BUFFER_MINUTES * 60 * 1000;

      for (let t = start; t + SLOT_DURATION <= end; t += SLOT_DURATION) {
        const conflict = busy.some(
          (b) =>
            t < b.end + BUFFER &&
            t + SLOT_DURATION > b.start - BUFFER
        );

        if (!conflict) {
          slots.push({
            start: new Date(t).toISOString(),
            end: new Date(t + SLOT_DURATION).toISOString(),
          });
        }
      }

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          availableSlots: slots,
        }),
      };
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid action" }),
    };
  } catch (error) {
    console.error("Booking error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
