const { google } = require("googleapis");

const BUFFER_MINUTES = 15; // travel + prep buffer

const AGENT_CALENDARS = {
  agent_1: "50c6100b59b98f15d357622284b567ff017f80155c91097b22c4e9cebb520e8d@group.calendar.google.com",
};

// convert ISO → Date
const toDate = (t) => new Date(t);

// add buffer
const addBuffer = (date, minutes) =>
  new Date(date.getTime() + minutes * 60000);

// check overlap
function isOverlapping(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return res(405, { error: "Method Not Allowed" });
  }

  try {
    const {
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      GOOGLE_PRIVATE_KEY,
      GOOGLE_CALENDAR_ID,
    } = process.env;

    if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !GOOGLE_CALENDAR_ID) {
      return res(500, { error: "Missing env vars" });
    }

    const body = JSON.parse(event.body || "{}");
    const { action = "book", title, startTime, endTime, description, agentId, eventId } = body;

    const privateKey = GOOGLE_PRIVATE_KEY.includes("\\n")
      ? GOOGLE_PRIVATE_KEY.replace(/\\n/g, "\n")
      : GOOGLE_PRIVATE_KEY;

    const auth = new google.auth.JWT(
      GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      privateKey,
      ["https://www.googleapis.com/auth/calendar"]
    );

    const calendarId =
      (agentId && AGENT_CALENDARS[agentId]) || GOOGLE_CALENDAR_ID;

    const calendar = google.calendar({ version: "v3", auth });

    // ===============================
    // 1. CANCEL BOOKING
    // ===============================
    if (action === "cancel") {
      if (!eventId) return res(400, { error: "Missing eventId" });

      await calendar.events.delete({
        calendarId,
        eventId,
      });

      return res(200, { success: true, message: "Booking cancelled" });
    }

    // ===============================
    // 2. RESCHEDULE BOOKING
    // ===============================
    if (action === "reschedule") {
      if (!eventId || !startTime || !endTime) {
        return res(400, { error: "Missing fields for reschedule" });
      }

      const updated = await calendar.events.patch({
        calendarId,
        eventId,
        requestBody: {
          start: { dateTime: startTime },
          end: { dateTime: endTime },
        },
      });

      return res(200, {
        success: true,
        message: "Rescheduled",
        eventId: updated.data.id,
      });
    }

    // ===============================
    // 3. SUGGEST SLOTS
    // ===============================
    if (action === "suggest") {
      const now = new Date();
      const later = new Date();
      later.setDate(now.getDate() + 3);

      const events = await calendar.events.list({
        calendarId,
        timeMin: now.toISOString(),
        timeMax: later.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
      });

      const busy = events.data.items || [];

      const suggestions = [];
      const step = 30;

      let cursor = new Date(now);
      cursor.setHours(9, 0, 0, 0);

      while (suggestions.length < 6) {
        const start = new Date(cursor);
        const end = new Date(start.getTime() + step * 60000);

        const conflict = busy.some((b) => {
          const bs = new Date(b.start.dateTime || b.start.date);
          const be = new Date(b.end.dateTime || b.end.date);

          return isOverlapping(
            addBuffer(start, -BUFFER_MINUTES),
            addBuffer(end, BUFFER_MINUTES),
            bs,
            be
          );
        });

        if (!conflict) {
          suggestions.push({
            start: start.toISOString(),
            end: end.toISOString(),
          });
        }

        cursor = new Date(cursor.getTime() + step * 60000);
      }

      return res(200, {
        success: true,
        suggestions,
      });
    }

    // ===============================
    // 4. BOOK (DEFAULT)
    // ===============================
    if (!startTime || !endTime) {
      return res(400, { error: "Missing time" });
    }

    const start = toDate(startTime);
    const end = toDate(endTime);

    const events = await calendar.events.list({
      calendarId,
      timeMin: new Date(start.getTime() - BUFFER_MINUTES * 60000).toISOString(),
      timeMax: new Date(end.getTime() + BUFFER_MINUTES * 60000).toISOString(),
      singleEvents: true,
    });

    const hasConflict = (events.data.items || []).some((e) => {
      const bs = new Date(e.start.dateTime || e.start.date);
      const be = new Date(e.end.dateTime || e.end.date);

      return isOverlapping(start, end, bs, be);
    });

    if (hasConflict) {
      return res(200, {
        success: false,
        error: "This time slot is already booked",
      });
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

    return res(200, {
      success: true,
      message: "Booking confirmed",
      eventId: response.data.id,
      htmlLink: response.data.htmlLink,
      calendarUsed: calendarId,
    });

  } catch (err) {
    return res(500, { error: err.message });
  }
};

function res(statusCode, body) {
  return {
    statusCode,
    body: JSON.stringify(body),
  };
}
