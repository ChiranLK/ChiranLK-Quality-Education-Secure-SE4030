/**
 * googleCalenderRouter.js
 *
 * V7-FIX: All routes now require authentication and appropriate role authorization.
 * Before: All four endpoints (auth/callback/events/status) had no middleware.
 *         /callback returned raw OAuth tokens in the HTTP response body.
 * After:  protect + authorizePermissions guard every route.
 *         /callback saves tokens server-side only — never returns them in response.
 *         /events accepts only an allow-listed set of body fields.
 */
import { Router } from 'express';
import { createOAuthClient, getAuthUrl, saveTokens, getAuthedClient, loadTokens } from '../utils/googleCalender.js';
import { google } from 'googleapis';
import { protect, authorizePermissions } from '../Middleware/authMiddleware.js';
import { BadRequestError } from '../errors/customErrors.js';

const router = Router();

// 1) Redirect to Google consent — admin only
// V7-FIX: unauthenticated callers can no longer initiate an OAuth flow with the app's credentials.
router.get('/auth', protect, authorizePermissions('admin'), (req, res) => {
  const url = getAuthUrl();
  res.redirect(url);
});

// 2) Exchange code for tokens — admin only
// V7-FIX: tokens are saved server-side; the response body no longer exposes them.
// Before: res.json({ msg: '...', tokens }) — raw access_token + refresh_token in response.
// After:  res.json({ msg: '...' })         — tokens stored securely, never returned.
router.get('/callback', protect, authorizePermissions('admin'), async (req, res, next) => {
  try {
    const code = req.query.code;
    if (!code) throw new BadRequestError('Missing OAuth code parameter');

    const oAuth2Client = createOAuthClient();
    const { tokens } = await oAuth2Client.getToken(code);
    // V7-FIX: NEVER log or return tokens.
    await saveTokens(tokens);
    res.json({ msg: 'Google OAuth successful. Tokens saved securely server-side.' });
  } catch (err) { next(err); }
});

// 3) Create a calendar event — admin or tutor only
// V7-FIX: unauthenticated callers receive 401; wrong role receives 403.
// Input is validated: only allow-listed fields accepted; required fields enforced.
router.post('/events', protect, authorizePermissions('admin', 'tutor'), async (req, res, next) => {
  try {
    // V7-FIX: allow-list — only accept explicitly named fields; discard everything else.
    const { summary, description, start, end, timeZone } = req.body;

    if (!summary || !start || !end) {
      throw new BadRequestError('summary, start, and end are required');
    }

    // Sanitise each field — truncate to safe lengths.
    const event = {
      summary:     String(summary).trim().substring(0, 200),
      description: String(description || '').trim().substring(0, 1000),
      start: { dateTime: start, timeZone: timeZone || 'UTC' },
      end:   { dateTime: end,   timeZone: timeZone || 'UTC' },
    };

    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    let auth;
    try {
      auth = await getAuthedClient();
    } catch (authErr) {
      // No credentials configured — return informative error rather than 500.
      throw new BadRequestError('Google Calendar not configured. Provide GOOGLE_REFRESH_TOKEN.');
    }

    const calendar = google.calendar({ version: 'v3', auth });
    const response = await calendar.events.insert({ calendarId, resource: event });
    res.status(201).json(response.data);
  } catch (err) { next(err); }
});

// 4) Status check — admin only
// V7-FIX: internal OAuth configuration is sensitive; restrict to admins.
router.get('/status', protect, authorizePermissions('admin'), async (req, res, next) => {
  try {
    const tokens = await loadTokens();
    res.json({
      authenticated:           !!tokens,
      hasRefreshTokenInEnv:    !!process.env.GOOGLE_REFRESH_TOKEN,
      clientIdConfigured:      !!process.env.GOOGLE_CLIENT_ID,
    });
  } catch (error) {
    next(error);
  }
});

export default router;