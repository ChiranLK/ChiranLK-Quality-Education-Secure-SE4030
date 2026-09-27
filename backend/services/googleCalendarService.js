// services/googleCalendarService.js
import { google } from "googleapis";
import { logSafeError, logSafeEvent } from "../utils/safeLogger.js";

let calendar = null;

// Initialize Google Calendar client
export const initCalendar = () => {
  if (
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REDIRECT_URI &&
    process.env.GOOGLE_REFRESH_TOKEN
  ) {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    calendar = google.calendar({ version: "v3", auth: oauth2Client });
    logSafeEvent("calendar_initialized", { outcome: "success" });
  } else {
    console.warn("Google Calendar disabled: missing credentials");
  }
};

export const getCalendar = () => {
  if (!calendar) throw new Error("Calendar client not initialized");
  return calendar;
};

// Helper: Convert schedule to Google Calendar event
const buildEventObject = (session) => {
  const { schedule, title, description, participants } = session;

  // Validate required fields
  if (!title || !title.trim()) {
    throw new Error("Session title is required for calendar event");
  }
  if (!schedule?.date || !schedule?.startTime || !schedule?.endTime) {
    throw new Error("Invalid session schedule data");
  }

  const dateStr = new Date(schedule.date).toISOString().split("T")[0]; // YYYY-MM-DD

  // Combine date + startTime / endTime
  const startDateTime = new Date(`${dateStr}T${schedule.startTime}:00+05:30`);
  const endDateTime = new Date(`${dateStr}T${schedule.endTime}:00+05:30`);

  const eventObject = {
    summary: title.trim(),
    description: description ? description.trim() : "Tutoring Session",
    start: { dateTime: startDateTime.toISOString(), timeZone: "Asia/Colombo" },
    end: { dateTime: endDateTime.toISOString(), timeZone: "Asia/Colombo" },
    attendees: Array.isArray(participants)
      ? participants
          .map((p) => p.userId?.email)
          .filter(Boolean)
          .map((email) => ({ email }))
      : [],
  };

  logSafeEvent("calendar_event_built", { count: eventObject.attendees.length });

  return eventObject;
};

// Create event
export const createCalendarEvent = async (session) => {
  const cal = getCalendar();
  const event = buildEventObject(session);
  
  try {
    const response = await cal.events.insert({ calendarId: "primary", resource: event });
    logSafeEvent("calendar_event_created", { outcome: "success" });
    return response.data.id;
  } catch (error) {
    logSafeError("calendar_event_creation_failed", error, { statusCode: 500 });
    throw error;
  }
};

// Update event
export const updateCalendarEvent = async (googleEventId, session) => {
  const cal = getCalendar();
  const event = buildEventObject(session);
  
  try {
    await cal.events.update({
      calendarId: "primary", 
      eventId: googleEventId, 
      resource: event 
    });
    logSafeEvent("calendar_event_updated", { outcome: "success" });
  } catch (error) {
    logSafeError("calendar_event_update_failed", error, { statusCode: 500 });
    throw error;
  }
};

// Delete event
export const deleteCalendarEvent = async (googleEventId) => {
  const cal = getCalendar();
  try {
    await cal.events.delete({ calendarId: "primary", eventId: googleEventId });
    logSafeEvent("calendar_event_deleted", { outcome: "success" });
  } catch (error) {
    logSafeError("calendar_event_deletion_failed", error, { statusCode: 500 });
    throw error;
  }
};
