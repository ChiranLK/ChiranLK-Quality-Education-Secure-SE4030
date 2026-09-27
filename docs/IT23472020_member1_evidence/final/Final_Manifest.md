# Security Fixes & OpenID Connect – Final Summary

**Module:** SE4030 – Secure Software Development
**Project:** TutorConnect (Quality-Education) – MERN stack
**Repository:** `ChiranLK/ChiranLK-Quality-Education-Secure-SE4030`
**Member:** IT23472020 – Maduwantha
**Branch:** `security-fixes_IT23472020_Maduwantha`

---

## 1. My Contribution at a Glance

| ID | Title | OWASP 2021 | CWE | Severity | Status | Commit |
|---|---|---|---|---|---|---|
| **V1** | Privilege Escalation via Google Sign-Up Role Parameter | A01: Broken Access Control | CWE-269 | Critical (CVSS 9.8) | ✅ Fixed | `16f41c6` |
| **V2** | JWT and User Data Exposed in Google OAuth Redirect URL | A07: Identification & Authentication Failures | CWE-598 / CWE-200 | Medium (CVSS 6.8) | ✅ Fixed | `d1b94a8` |
| **V10** | Missing Rate Limiting on Login and Password Reset | A07: Identification & Authentication Failures | CWE-307 | Medium (CVSS 4.8) | ✅ Fixed | `cca5cdd` |
| **OIDC** | Google Sign-In upgraded from OAuth 2.0 to OpenID Connect (Authorization Code + PKCE) | A07 (hardening) | CWE-352 (login CSRF), CWE-287 | Feature | ✅ Implemented | `a1a095e` |

Pull requests: my work was merged into `main` through PR **#18** (V10) and PR **#19** (OpenID Connect). V1 and V2 were merged earlier from the same branch.

---

## 2. V1 – Privilege Escalation via Google Sign-Up Role Parameter

**Where:** `backend/Controllers/googleAuthController.js` (sign-in URL builder and callback)

**Problem**
The role for a new Google account came straight from the request (`req.query.role`) and was copied into the OAuth `state`. On callback the server trusted this value when creating the user. Nothing on the server limited which role could be chosen, so a self-registered account could end up with the `admin` role.

**Impact**
Full administrative access to the platform for any person with a Google account: managing users, tutors, sessions and data. This breaks the principle of least privilege.

**Fix**
- Added a server-side allow-list in a new helper file `backend/utils/oauthSecurity.js`:
  - `SELF_SIGNUP_ROLES = ["user", "tutor"]`
  - `sanitizeSignupRole(role)` returns the role only if it is in the list, otherwise `"user"`.
- Used `sanitizeSignupRole()` both when building the Google URL and again in the callback before `User.create()` (defence in depth – the state value is never trusted).
- Admin accounts can only be created by existing admins or seed scripts, never through self sign-up.

**Files changed**
- `backend/utils/oauthSecurity.js` (new)
- `backend/Controllers/googleAuthController.js`

**Verification**
- Sign-up requests asking for any role other than `user`/`tutor` now create a `user` account.
- MongoDB Atlas shows `role: "user"` for the new account (before the fix it showed `admin`).
- Unit check of `sanitizeSignupRole()` with `user`, `tutor`, `admin`, empty and non-string values → `user tutor user user user`.

---

## 3. V2 – JWT and User Data Exposed in Google OAuth Redirect URL

**Where:** `googleAuthController.js` (callback), `client/src/pages/auth-success.jsx`, `client/src/context/AuthContext.jsx`

**Problem**
After Google login the backend redirected to `/auth-success?token=<JWT>&user=<JSON>`. The long-lived login token and personal data were placed in the URL, where they are stored in browser history, can leak through the `Referer` header, and appear in server/proxy logs.

**Impact**
Anyone who gets the URL (shared computer, history, logs, extensions) can reuse the JWT and take over the session for up to 24 hours, and can read the user’s personal details.

**Fix – one-time login code exchange**
1. The callback now creates a random one-time code (`crypto.randomBytes(32)`), stores only its **SHA-256 hash** in a new `LoginTicket` collection, and redirects to `/auth-success?code=<code>`.
2. The code is valid for **60 seconds** (MongoDB TTL index) and is **single-use** (`findOneAndDelete`).
3. The client immediately removes the code from the address bar (`history.replaceState`) and sends it in a **POST** body to `/api/google-oauth/exchange`.
4. The server returns the JWT (and sets the httpOnly cookie) only in the POST response – never in a URL.
5. Error redirects use fixed error codes (`server_error`, `access_denied`, …) mapped to safe messages on the client, instead of raw error text in the URL.
6. `Referrer-Policy: no-referrer` on the success page; a `useRef` guard stops React StrictMode from sending the code twice.

**Files changed**
- `backend/models/LoginTicketModel.js` (new)
- `backend/utils/oauthSecurity.js` (`randomToken`, `hashToken`)
- `backend/Controllers/googleAuthController.js` (callback + new `exchangeLoginCode`)
- `backend/Routes/googleOAuthRouter.js` (`POST /exchange`)
- `client/src/pages/auth-success.jsx`
- `client/src/pages/auth-error.jsx`
- `client/src/context/AuthContext.jsx` (removed reading token from URL)

**Verification**
- Browser history search for `auth-success` → no URL containing a token.
- Network tab: `POST /api/google-oauth/exchange` → `200` with the session.
- Sending the same code again → `400` (single-use works). Waiting more than 60 s → `400` (expiry works).
- OWASP ZAP passive alert *“Information Disclosure – Sensitive Information in URL”* present before, gone after.

---

## 4. V10 – Missing Rate Limiting on Login and Password Reset

**Where:** `backend/Routes/authRouter.js`

**Problem**
The login, forgot-password and reset-password endpoints accepted unlimited requests from the same client.

**Impact**
Allows automated password guessing and credential-stuffing against user accounts, and flooding of password-reset emails.

**Fix**
- Added `express-rate-limit` and a new middleware file `backend/Middleware/rateLimiter.js`:
  - `loginLimiter` – 10 failed attempts per 15 minutes (`skipSuccessfulRequests: true`, so normal users are not blocked).
  - `passwordResetLimiter` – stricter limit on forgot/reset password.
  - `authLimiter` – general limit for other auth routes.
  - Standard `RateLimit` headers (draft-7) and a JSON `{ msg }` response with HTTP **429**.
- Limiters placed **first** in the middleware chain on the 4 auth routes, before validation and database work.
- `app.set("trust proxy", 1)` only in production so the client IP is read correctly behind a proxy without letting local users spoof `X-Forwarded-For`.

**Files changed**
- `backend/Middleware/rateLimiter.js` (new)
- `backend/Routes/authRouter.js`
- `backend/server.js`
- `backend/package.json`, `backend/package-lock.json`

**Verification**
- Before: 15 wrong logins → 15 × `401`.
- After: 15 wrong logins → 10 × `401`, then 5 × `429 Too Many Requests`.
- A correct login still works for a different account / after the window resets.

---

## 5. OpenID Connect – Authorization Code Flow with PKCE

**Grant type:** OAuth 2.0 Authorization Code grant with PKCE (RFC 7636), used as OpenID Connect (scope `openid`).
**Type of change:** Update of the existing Google OAuth sign-in feature.

### 5.1 Why the upgrade
The old sign-in used plain OAuth 2.0: it asked for profile scopes, took an access token and called the Google `userinfo` API. It had no `state` check (login CSRF), no `nonce`, no PKCE, requested offline access it did not need, and linked accounts by email without checking whether the email was verified.

### 5.2 New flow

```
Browser                Backend (/api/google-oauth)                 Google
   |  GET /start?role=user  |                                          |
   |----------------------->| create state, nonce, code_verifier      |
   |                        | save hashed state + verifier (10 min TTL)|
   |                        | set httpOnly cookie g_oauth_state        |
   |<-- 302 to Google ------| (code_challenge = S256(verifier))       |
   |------------------------------------------------------------------>| user signs in
   |<------------------ 302 /callback?code=...&state=... --------------|
   |----------------------->| check state == cookie, delete state row |
   |                        | exchange code + code_verifier ---------->|
   |                        |<------------- id_token ------------------|
   |                        | verifyIdToken: signature, iss, aud, exp  |
   |                        | check nonce, email_verified              |
   |                        | find/create user by `sub`                |
   |<-- 302 /auth-success?code=<one-time code> (V2 fix) ---------------|
   |  POST /exchange {code} |                                          |
   |----------------------->| return JWT + httpOnly cookie             |
```

### 5.3 Security controls added

| Control | Purpose |
|---|---|
| `scope: openid email profile` | Get a signed **ID token** instead of relying on the userinfo API |
| **PKCE (S256)** – `code_verifier` stored server-side, `code_challenge` sent to Google | Stolen authorization codes cannot be redeemed |
| **`state`** – random, hashed in DB, bound to httpOnly cookie `g_oauth_state` (`sameSite: lax`, path `/api/google-oauth`), compared with `timingSafeEqual` | Prevents login CSRF and callback replay |
| **`nonce`** – checked inside the ID token | Prevents ID token replay |
| `verifyIdToken()` (google-auth-library) | Checks signature, issuer, audience (client ID) and expiry |
| `email_verified` must be `true` | Stops account linking with unverified emails |
| User identified by Google **`sub`** (stored as `googleId`) | Stable, unique identifier instead of email |
| Existing password account with same email → `account_conflict` error | No silent account takeover by linking |
| `access_type: online` | No unnecessary refresh tokens |
| `OAuthState` rows expire after 10 minutes and are deleted on use | Single-use, short-lived login attempts |
| Role still passed through `sanitizeSignupRole()` | Keeps V1 fix |
| Final hand-off still uses one-time code exchange | Keeps V2 fix |

### 5.4 Files changed
- `backend/models/OAuthStateModel.js` (new – `stateHash`, `codeVerifier`, `nonce`, `role`, `expiresAt` TTL)
- `backend/utils/oauthSecurity.js` (`pkceChallenge`, `safeEqual`)
- `backend/Controllers/googleAuthController.js` (`startGoogleSignIn`, rewritten `handleGoogleCallback`, removed unused broken `getCalendarAuthUrl`)
- `backend/Routes/googleOAuthRouter.js` (`GET /start`, `GET /callback`, `POST /exchange`)
- `client/src/utils/googleOAuth.js` (browser goes to `/api/google-oauth/start`)
- `client/src/pages/auth-error.jsx` (`account_conflict`, `email_not_verified` messages)
- Google Cloud Console: scopes `openid`, `email`, `profile` added under Data Access; redirect URI `http://localhost:5000/api/google-oauth/callback`.

### 5.5 Verification
- Redirect to Google contains `code_challenge=...&code_challenge_method=S256`, `state`, `nonce`, `scope=openid email profile`.
- Normal Google sign-in works for new and existing users.
- Callback with a changed or missing `state` → rejected (`session_expired`).
- Replaying an old callback URL → rejected (state already deleted).
- V1, V2 and V10 re-tested after the upgrade – all still pass.

---

## 6. Testing Approach

| Type | Tool | Used for |
|---|---|---|
| White-box (SAST) | **Semgrep** (custom rules) | Role taken from request, token in URL, missing rate limiter |
| White-box (dependencies) | **npm audit** | Checked new packages (`express-rate-limit`, `google-auth-library`) |
| White-box | Code review of `git diff` for each commit | Confirm only intended changes |
| Black-box (DAST) | **OWASP ZAP** (manual explore, passive scan, Request Editor, Fuzzer) | Sensitive info in URL (V2), repeated login requests (V10), tampered OAuth parameters |
| Black-box | Browser DevTools (Network, Console, History) | Exchange request, 401/429 codes, URL contents |
| Data check | MongoDB Atlas | Role of created user (V1), TTL collections (V2, OIDC) |

All testing was done only against the local environment (`localhost`). Test accounts were removed afterwards.

---

## 7. Preventive Practices

1. **Never trust client input for authorization decisions** – roles, prices, IDs must be decided or validated on the server with allow-lists.
2. **Keep secrets out of URLs** – tokens go in POST bodies, headers or httpOnly cookies; use short-lived, single-use codes for redirects.
3. **Rate limit every authentication endpoint** and monitor 429/401 spikes.
4. **Use standard protocols correctly** – OpenID Connect with PKCE, `state` and `nonce`; verify ID tokens with a maintained library.
5. **Least privilege for scopes** – request only `openid email profile`, online access.
6. **Secrets management** – `.env` and `google-tokens.json` are in `.gitignore`; credentials exposed during development are rotated.
7. **Security in the workflow** – Semgrep and `npm audit` before merging, one commit per fix, pull-request review.

---

## 8. Limitations / Not Fixed in My Scope

| Item | Reason |
|---|---|
| Rate limit uses in-memory store | Fine for one server; a shared store (e.g. Redis) is needed if the backend is scaled to several instances |
| JWT is still stored in `sessionStorage` on the client (existing app design) | Changing the whole app to cookie-only auth affects every page and other members’ work; the httpOnly cookie is already set as well |
| Google Calendar integration still uses its own OAuth client | Separate feature owned by another member; not part of sign-in |
| No account lockout / CAPTCHA | Rate limiting covers the brute-force risk for this assignment; lockout can be added later |

---

## 9. Commit History (my work)

| Commit | Message |
|---|---|
| `16f41c6` | Fix: stop Google sign-up from creating admin accounts |
| `d1b94a8` | Fix: stop sending the login token in the Google redirect URL |
| `cca5cdd` | Fix: add rate limiting to login and password reset |
| `a1a095e` | Feat: upgrade Google sign-in to OpenID Connect with PKCE |

---

## 10. Evidence

Stored in `docs/IT23472020_evidence/final/`:

| Folder | Contents |
|---|---|
| `Git/` | Commit history, files changed per commit |
| `V1/` | Before code, fix diff, allow-list code, Atlas before/after, role test |
| `V2/` | Token-in-URL before, fix diffs (backend + client), LoginTicket model, history check, exchange 200, replay 400, ZAP alert before/after |
| `V10/` | Routes before, fix diff, limiter code, 401 vs 429 console results |
| `OIDC/` | Plain OAuth before, controller diff, PKCE helpers, OAuthState model, routes, Google redirect with `code_challenge`/`S256`, Data Access scopes, sequence diagram |

---

## 11. How to Run

```bash
# backend
cd backend
npm install
npm run dev          # http://localhost:5000

# client (second terminal)
cd client
npm install
npm run dev          # http://localhost:5173
```

Required backend `.env` keys (values not committed): `MONGO_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BACKEND_URL`, `FRONTEND_URL`.