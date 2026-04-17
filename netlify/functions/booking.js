const { google } = require("googleapis");
const { createClient } = require("@supabase/supabase-js");

const BUFFER_MINUTES = 15;

// =====================
// SUPABASE (SAAS LOCK)
// =====================
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// =====================
// CONFIG
// =====================
const AGENT_CALENDARS = {
  agent_1: "50c6100b59b98f15d357622284b567ff017f80155c91097b22c4e9cebb520e8d@group.calendar.google.com",
};

// =====================
// HELPERS
// =====================
const res = (statusCode, body) => ({
  statusCode,
  body: JSON.stringify(body),
});

const toDate = (t) => new Date(t);

const overlap = (aStart, aEnd, bStart, bEnd) =>
  aStart < bEnd && bStart < aEnd;

const applyBuffer = (date, minutes) =>
  new Date(date.getTime() + minutes * 60000);

function getCalendarId(agentId, fallback) {
  return (agentId && AGENT_CALENDARS[agentId]) || fallback;
}

function makeAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !key) throw new Error("Missing Google auth env vars");

  const privateKey = key.includes("\\n")
    ? key.replace(/\\n/g, "\n")
    : key;

  return new google.auth.JWT(email, null, privateKey, [
    "https://www.googleapis.com/auth/calendar",
  ]);
}

// =====================
// MAIN HANDLER
// =====================
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return res(405, { success: false, error: "Method not allowed" });
    }

    const { GOOGLE_CALENDAR_ID } = process.env;

    if (!GOOGLE_CALENDAR_ID) {
      return res(500, { success: false, error: "Missing calendar env var" });
    }

    const body = JSON.parse(event.body || "{}");

    const {
      email,
      action = "book",
      title,
      startTime,
      endTime,
      description,
      agentId,
      eventId,
    } = body;

    const auth = makeAuth();
    const calendar = google.calendar({ version: "v3", auth });
    const calendarId = getCalendarId(agentId, GOOGLE_CALENDAR_ID);

    // =====================
    // SAAS ACCESS CHECK (FINAL LOCK)
    // =====================
    if (action === "book") {
      if (!email) {
        return res(400, { success: false, error: "Missing email" });
      }

      const { data } = await supabase
        .from("users")
        .select("subscription_status")
        .eq("email", email)
        .single();

      if (!data || data.subscription_status !== "active") {
        return res(403, {
          success: false,
          error: "Payment required to access booking system",
        });
      }
    }

    // =====================
    // CANCEL
    // =====================
    if (action === "cancel") {
      if (!eventId) {
        return res(400, { success: false, error: "Missing eventId" });
      }

      await calendar.events.delete({ calendarId, eventId });

      return res(200, {
        success: true,
        message: "Booking cancelled",
      });
    }

    // =====================
    // RESCHEDULE
    // =====================
    if (action === "reschedule") {
      if (!eventId || !startTime || !endTime) {
        return res(400, { success: false, error: "Missing fields" });
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

    // =====================
    // SUGGEST SLOTS
    // =====================
    if (action === "suggest") {
      const now = new Date();
      const endWindow = new Date();
      endWindow.setDate(now.getDate() + 3);

      const events = await calendar.events.list({
        calendarId,
        timeMin: now.toISOString(),
        timeMax: endWindow.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
      });

      const busy = events.data.items || [];
      const suggestions = [];

      let cursor = new Date(now);
      cursor.setHours(9, 0, 0, 0);

      const STEP_MINUTES = 30;

      while (suggestions.length < 6) {
        const start = new Date(cursor);
        const end = new Date(start.getTime() + STEP_MINUTES * 60000);

        const conflict = busy.some((b) => {
          const bs = new Date(b.start?.dateTime || b.start?.date);
          const be = new Date(b.end?.dateTime || b.end?.date);

          return overlap(
            applyBuffer(start, -BUFFER_MINUTES),
            applyBuffer(end, BUFFER_MINUTES),
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

        cursor = new Date(cursor.getTime() + STEP_MINUTES * 60000);
      }

      return res(200, { success: true, suggestions });
    }

    // =====================
    // BOOK (DEFAULT)
    // =====================
    if (!startTime || !endTime) {
      return res(400, { success: false, error: "Missing time" });
    }

    const start = toDate(startTime);
    const end = toDate(endTime);

    const events = await calendar.events.list({
      calendarId,
      timeMin: applyBuffer(start, -BUFFER_MINUTES).toISOString(),
      timeMax: applyBuffer(end, BUFFER_MINUTES).toISOString(),
      singleEvents: true,
    });

    const hasConflict = (events.data.items || []).some((e) => {
      const bs = new Date(e.start?.dateTime || e.start?.date);
      const be = new Date(e.end?.dateTime || e.end?.date);

      return overlap(start, end, bs, be);
    });

    if (hasConflict) {
      return res(409, {
        success: false,
        error: "This time slot is already booked",
      });
    }

    // =====================
    // CREATE EVENT WITH REMINDERS
    // =====================
    const created = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: title || "Property Showing",
        description: description || "Booked via PropAI",

        start: { dateTime: startTime },
        end: { dateTime: endTime },

        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 },
            { method: "email", minutes: 60 },
            { method: "popup", minutes: 60 },
          ],
        },
      },
    });

    return res(200, {
      success: true,
      message: "Booking confirmed",
      eventId: created.data.id,
      htmlLink: created.data.htmlLink,
      calendarUsed: calendarId,
    });
  } catch (err) {
    return res(500, {
      success: false,
      error: err.message,
    });
  }
};
