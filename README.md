# Quality Education — Secure Software Development Project

> SE4030 Secure Software Development | MERN peer-learning and tutoring platform

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Security](https://img.shields.io/badge/Security-14_findings_remediated-success)](#security-assessment-and-remediation)
[![OIDC](https://img.shields.io/badge/Google-OIDC_%2B_PKCE-4285F4?logo=google&logoColor=white)](#openid-connect-implementation)

## Contents

- [Project overview](#project-overview)
- [Team and individual contributions](#team-and-individual-contributions)
- [Core platform features](#core-platform-features)
- [Architecture and technology](#architecture-and-technology)
- [Security assessment and remediation](#security-assessment-and-remediation)
- [OpenID Connect implementation](#openid-connect-implementation)
- [Secure development practices](#secure-development-practices)
- [Local installation](#local-installation)
- [Environment configuration](#environment-configuration)
- [Testing and verification](#testing-and-verification)
- [API overview](#api-overview)
- [Evidence and commit traceability](#evidence-and-commit-traceability)
- [Known residual risks](#known-residual-risks)
- [Deployment and submission links](#deployment-and-submission-links)

## Project overview

Quality Education is a full-stack peer-learning and tutoring application for school students, tutors, and administrators. Students can request academic support, join tutoring sessions, access study materials, review tutors, and monitor their progress. Tutors can manage sessions and learning resources, respond to help requests, and track students. Administrators receive protected management and reporting capabilities.

This repository is the security-enhanced SE4030 version of the application. The team reviewed the original system, identified fourteen vulnerabilities, implemented remediations, added regression tests and evidence, and upgraded Google sign-in to OpenID Connect Authorization Code flow with PKCE.

The security work focuses on access control, safe authentication and recovery, protection of tokens and personal data, input validation, secure OAuth/OpenID Connect, browser hardening, abuse prevention, and security regression testing.

## Team and individual contributions

The member labels in the assignment summary map to the following students:

| Member | Student ID | Assigned security work | Additional responsibility |
|---|---|---|---|
| **Maduwantha H.A.S.** | **IT23472020** | V1, V2, V10 and the OpenID Connect upgrade | OIDC report section, sequence flow, authentication demo, video introduction and wrap-up |
| **Serasinghe C.S.** | **IT23401976** | V3, V4 and V5 | Access-control section and video editing |
| **Alahakoon P.B.** | **IT23405240** | V6, V7, V8 and V14 | ZAP/secret-scan work, evidence, and scan overview |
| **Nimadith L.M.H.** | **IT23242272** | V9, V11, V12 and V13 | Secure-development discussion and README responsibility |

### Contribution summary

#### Maduwantha H.A.S. — authentication and OpenID Connect

- Prevented Google self-sign-up from creating an administrator account with a server-side `user`/`tutor` allow-list.
- Removed the application JWT and full user record from the Google callback redirect URL.
- Introduced a hashed, single-use login ticket with a 60-second expiry and POST exchange.
- Added rate limiting to login, password-reset, and related public authentication endpoints.
- Upgraded Google sign-in to OpenID Connect Authorization Code flow with PKCE, `state`, and `nonce` verification.

#### Serasinghe C.S. — access control and mass assignment

- Restricted normal registration to the `user` and `tutor` roles.
- Enforced administrator authorization on privileged user, feedback, and progress routes.
- Replaced broad request-body assignment with explicit field allow-lists for profiles and help requests.
- Preserved ownership checks and enabled Mongoose validation during protected updates.
- Added focused unit and integration regression coverage for V3, V4, and V5.

#### Alahakoon P.B. — data protection, integration security, secrets, and ReDoS

- Protected tutoring-session listings and minimized exposed participant/tutor information.
- Added authentication and role authorization to email and Google Calendar endpoints.
- Removed tracked Google token material and hard-coded secret fallbacks from the current tree.
- Escaped user-controlled regular-expression text and limited search input to 100 characters.
- Added 39 focused integration tests for V6, V7, and V14 and prepared supporting evidence.

#### Nimadith L.M.H. — logging, authentication policy, and configuration

- Removed sensitive logging and prevented internal stack/error disclosure in production responses.
- Made `/check-email` responses uniform so they do not reveal account existence or role.
- Centralized a strong password policy, raised bcrypt work factor to 12, and moved seed credentials to environment variables.
- Added Helmet-based browser security headers and centralized secure authentication-cookie settings.
- Added a 29-test regression suite for V9, V11, V12, and V13 and documented the secure-development discussion.

## Core platform features

### Students

- Create and manage a student account.
- Sign in with credentials or Google OpenID Connect.
- Submit academic help requests with multilingual input and English translation support.
- Browse and join tutoring sessions.
- View, download, and like study materials.
- Submit tutor feedback and ratings.
- View personal learning progress.

### Tutors

- Create, update, and delete tutoring sessions.
- Manage enrolled students and session capacity.
- Upload and manage study materials through Cloudinary.
- View help requests and student progress.
- Use eligible Google Calendar functions.
- Receive feedback-related email notifications.

### Administrators

- Manage users and create administrators through protected routes.
- Review platform feedback and progress data.
- Access protected email and Calendar administration endpoints.
- Use dashboard reporting without exposing privileged APIs to normal users.

## Architecture and technology

```text
┌──────────────────────────────────────────────────────────────┐
│ React 19 + Vite client                                      │
│ Pages • Context/Zustand state • Axios • dashboards          │
└───────────────────────────┬──────────────────────────────────┘
                            │ HTTPS / JSON / JWT or cookie
┌───────────────────────────▼──────────────────────────────────┐
│ Node.js + Express 5 API                                    │
│ Routes → security middleware → controllers → services       │
└──────────────┬──────────────┬─────────────┬──────────────────┘
               │              │             │
       ┌───────▼───────┐ ┌────▼─────┐ ┌────▼─────────────────┐
       │ MongoDB       │ │Cloudinary│ │ Google / SMTP        │
       │ + Mongoose    │ │ files    │ │ OIDC, Calendar, mail │
       └───────────────┘ └──────────┘ └──────────────────────┘
```

### Main technology stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 5, React Router 7, Axios, Zustand, Tailwind CSS, Recharts, Framer Motion |
| Backend | Node.js, Express 5, Mongoose, MongoDB |
| Authentication | JWT, HTTP cookies, bcryptjs, Google OpenID Connect |
| OIDC security | Authorization Code, PKCE S256, `state`, `nonce`, verified ID tokens, single-use login tickets |
| File storage | Multer and Cloudinary |
| Integrations | Google Calendar, Google Gemini, Nodemailer/SMTP |
| Application security | Helmet, `express-rate-limit`, `express-validator`, authorization middleware, safe logging |
| Testing | Jest, Supertest, MongoDB Memory Server, Artillery, JMeter assets |

### Repository layout

```text
.
├── Client/                         React/Vite frontend
│   ├── src/components/             Shared UI and feature components
│   ├── src/context/                Cross-feature React state
│   ├── src/pages/                  Authentication and dashboard pages
│   └── src/utils/                  API and Google sign-in helpers
├── backend/                        Express API
│   ├── Controllers/                Request and application logic
│   ├── Middleware/                 Authentication, authorization, validation, headers, rate limits
│   ├── Routes/                     REST endpoint definitions
│   ├── models/                     Domain models, OAuth state, and login tickets
│   ├── services/                   Mail, calendar, session, and material services
│   ├── tests/                      Unit, integration, performance, and JMeter tests
│   └── utils/                      Security and application utilities
└── docs/
    ├── security/                   Member 2 security reports
    ├── member3_evidence/           Member 3 manifests, results, and screenshots
    └── member4_evidence/           Member 4 manifests, results, discussion, and screenshots
```

## Security assessment and remediation

The team addressed all fourteen identified code-level findings in the current repository. The table preserves the assignment document's OWASP 2021/CWE classifications and severities.

| ID | Vulnerability | Classification | Severity | Owner | Implemented remediation | Status |
|---|---|---|---|---|---|---|
| V1 | Google self-sign-up trusted a browser-supplied admin role | A01 / CWE-269 | Critical | Maduwantha | Server-side self-sign-up role allow-list, checked when starting and completing sign-in | Fixed |
| V2 | Login token and user data appeared in the redirect URL | A07 / CWE-598 | Medium | Maduwantha | 60-second, hashed, single-use login code exchanged by POST; fixed public error codes | Fixed |
| V3 | Normal registration allowed public admin assignment | A01 / CWE-269 | Critical | Serasinghe | Registration accepts only `user`/`tutor` and constructs users from named fields | Fixed |
| V4 | Admin endpoints checked authentication but not role | A01 / CWE-285 | Critical | Serasinghe | Central admin authorization applied after authentication on privileged routes | Fixed |
| V5 | Profile and message/help-request updates allowed mass assignment | A08 / CWE-915 | High | Serasinghe | Explicit editable-field allow-lists, ownership checks, and validators | Fixed |
| V6 | Public endpoints exposed student names and emails | A01 / CWE-359 | Medium | Alahakoon | Authentication gate and response data minimization for session listings | Fixed |
| V7 | Email and Calendar endpoints lacked adequate authentication | A01, A05 / CWE-306 | High | Alahakoon | Authentication/role guards, sanitized callbacks, no token responses, escaped content | Fixed |
| V8 | Google OAuth token material and fallback secrets were committed | A02 / CWE-798 | High | Alahakoon | Removed from current tracking, strengthened `.gitignore`, removed fallback secrets | Current tree fixed; historical credential revocation must be confirmed by its owner |
| V9 | Tokens reached logs and stack traces reached responses | A09 / CWE-532, CWE-209 | Medium | Nimadith | Allow-listed safe logging, generic production errors, opt-in diagnostics | Fixed |
| V10 | Login and password reset had no rate limit | A07 / CWE-307 | Medium | Maduwantha | Per-client login, reset, and public-auth limiters with HTTP 429 responses | Fixed |
| V11 | `/check-email` disclosed account existence and role | A07 / CWE-204 | Low–Medium | Nimadith | Identical generic response for valid addresses; no account lookup or role disclosure | Fixed |
| V12 | Weak passwords and source-controlled seed credentials | A07 / CWE-521 | Low–Medium | Nimadith | Shared strong-password policy, bcrypt cost 12, environment-driven safe seeding | Fixed |
| V13 | Missing security headers and inconsistent cookies | A05 / CWE-693 | Low | Nimadith | Helmet policies and centralized HttpOnly/SameSite/Secure cookie configuration | Fixed |
| V14 | Raw user input was used as a regular expression | A03 / CWE-1333 | Low–Medium | Alahakoon | Regex metacharacter escaping and a 100-character search limit | Fixed |

### Security behavior after remediation

- Unauthenticated requests receive `401 Unauthorized` where authentication is required.
- Authenticated users without the required role receive `403 Forbidden`.
- Public registration and Google sign-up cannot create administrators.
- Client input cannot overwrite roles, ownership, verification, ratings, or other server-managed fields.
- Personal participant data is excluded from general session-list responses.
- Passwords require at least eight characters, uppercase, lowercase, a number, and a special character.
- Authentication and recovery endpoints return `429 Too Many Requests` after configured limits.
- Production server errors use generic responses and do not expose stack traces.
- Search strings are interpreted as literal text rather than executable regular expressions.
- Browser responses include security headers; authentication cookies are HttpOnly, SameSite Lax, and Secure in production.

## OpenID Connect implementation

The existing Google login was upgraded from an unsafe custom OAuth hand-off to OpenID Connect Authorization Code flow with PKCE.

### Why Authorization Code with PKCE

Authorization Code flow keeps provider tokens out of the browser URL and performs the token exchange at the backend. PKCE binds the returned authorization code to the sign-in attempt that created it. This is preferred over the deprecated Implicit and Resource Owner Password flows; Client Credentials is not suitable because this feature authenticates an end user.

### Implemented controls

| Control | Purpose |
|---|---|
| `state` | Random value bound to an HttpOnly browser cookie to prevent login CSRF |
| PKCE S256 | Server-held verifier and SHA-256 challenge that prevent use of a stolen authorization code |
| `nonce` | Bound to the ID token and checked to prevent ID-token replay |
| ID-token verification | Checks Google signature, issuer, audience/client ID, expiry, nonce, and `email_verified` |
| Minimal scopes | Requests only `openid`, `email`, and `profile`; no refresh token for sign-in |
| Safe role assignment | Stores only the server-sanitized `user` or `tutor` role with the OAuth attempt |
| Safe account linking | Uses Google's stable `sub`; links by verified email only; rejects conflicts |
| Single-use state | Stored with a ten-minute expiry and consumed once |
| Single-use login code | Frontend receives a random 60-second code and exchanges it once by POST |
| Fixed errors | Redirects expose a fixed identifier rather than provider/server exception details |

### Sign-in sequence

```text
Browser                Express backend                 Google OIDC
   │ GET /start?role=...      │                              │
   ├─────────────────────────>│ create state, nonce, PKCE    │
   │                          │ store attempt; set cookie    │
   │<─────────────────────────┤ redirect with S256 challenge │
   ├────────────────────────────────────────────────────────>│
   │                    user authenticates                   │
   │<────────────────────────────────────────────────────────┤
   │ GET /callback?code&state│                              │
   ├─────────────────────────>│ validate cookie + state      │
   │                          │ exchange code + verifier ───>│
   │                          │<──────── ID/access tokens ───┤
   │                          │ verify ID token + nonce      │
   │                          │ find/link/create user        │
   │<─────────────────────────┤ redirect with one-time code  │
   │ POST /exchange { code }  │                              │
   ├─────────────────────────>│ consume ticket; issue app JWT│
   │<─────────────────────────┤ authenticated user response  │
```

Endpoints:

- `GET /api/google-oauth/start?role=user|tutor`
- `GET /api/google-oauth/callback`
- `POST /api/google-oauth/exchange`

## Secure development practices

- Perform STRIDE threat modelling for authentication, authorization, data flow, and external integrations.
- Use OWASP ASVS and OWASP cheat sheets as design and review checklists.
- Apply deny-by-default authorization middleware to every non-public route.
- Treat roles, ownership, verification status, ratings, and audit fields as server-controlled.
- Allow-list request fields instead of passing complete bodies to database updates.
- Keep credentials in environment variables and run secret scanning before every push.
- Run static analysis, dependency scanning, secret scanning, and DAST in CI.
- Add a negative security regression test for every discovered vulnerability.
- Minimize response data and never log tokens, cookies, passwords, full user objects, or provider payloads.
- Prefer proven protocols and libraries over custom authentication hand-offs.
- Review dependency upgrades and breaking changes through a tested maintenance process.

The assessment used or recommended manual code review, Semgrep, npm audit, gitleaks/TruffleHog, OWASP ZAP, Burp Suite Community, and MongoDB Compass. Evidence should use synthetic accounts and must not include live tokens, credentials, `.env` values, or personal information.

## Local installation

### Prerequisites

- Node.js 22 or later and npm 10 or later
- MongoDB locally or a MongoDB Atlas connection string
- Git
- Optional integration accounts: Google Cloud, Cloudinary, Gemini, and SMTP/Mailtrap

### 1. Clone the repository

```bash
git clone https://github.com/ChiranLK/ChiranLK-Quality-Education-Secure-SE4030.git
cd ChiranLK-Quality-Education-Secure-SE4030
```

### 2. Configure and start the backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

The API listens on `http://localhost:5000` by default. Check it with `curl http://localhost:5000/health`.

### 3. Configure and start the frontend

Open a second terminal:

```bash
cd Client
cp .env.example .env
npm install
npm run dev
```

Vite normally serves the client at `http://localhost:5173`. Never commit either `.env` file; only `.env.example` templates belong in version control.

## Environment configuration

### Backend (`backend/.env`)

| Variable | Required for | Example/notes |
|---|---|---|
| `PORT` | API server | `5000` |
| `NODE_ENV` | Environment-specific security | Use `production` in production |
| `MONGO_URI` | Database | Local MongoDB or Atlas URI |
| `JWT_SECRET` | Application JWT signing | Use a long random secret |
| `JWT_EXPIRE_IN` | JWT lifetime | Example: `7d` |
| `FRONTEND_URL` | CORS and OAuth target | `http://localhost:5173` |
| `BACKEND_URL` | OIDC callback construction | `http://localhost:5000` |
| `GOOGLE_CLIENT_ID` | Google OIDC and Calendar | Google Cloud web-client ID |
| `GOOGLE_CLIENT_SECRET` | Google OIDC | Backend only |
| `GOOGLE_REDIRECT_URI` | Google configuration | `http://localhost:5000/api/google-oauth/callback` |
| `GOOGLE_REFRESH_TOKEN` | Calendar integration | Not requested by the login-only OIDC flow |
| `GOOGLE_CALENDAR_ID` | Calendar integration | Usually `primary` |
| `CLOUDINARY_*` | File storage | Cloud name, API key, and backend-only secret |
| `GEMINI_API_KEY` | Translation | Google Gemini API key |
| `MAIL_PROVIDER` and mail variables | Email | Selected sandbox/Gmail SMTP values |
| `SEED_*_EMAIL` / `SEED_*_PASSWORD` | Optional seeding | Non-production and password-policy compliant |

Use the complete placeholder list in [`backend/.env.example`](backend/.env.example).

### Frontend (`Client/.env`)

```dotenv
VITE_BACKEND_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

Use [`Client/.env.example`](Client/.env.example). `VITE_` values are visible to browser code, so never place secrets, database URIs, or SMTP passwords there.

### Google Cloud setup

1. Create or select a Google Cloud project.
2. Configure the OAuth consent screen and test users.
3. Create a Web application OAuth client.
4. Add `http://localhost:5000/api/google-oauth/callback` as an authorized redirect URI.
5. Add the production callback URI separately.
6. Configure only `openid`, `email`, and `profile` for login.
7. Keep the client secret exclusively in the backend environment.

## Testing and verification

Run commands from `backend/` unless noted otherwise.

### General suites

```bash
npm test
npm run test:unit
npm run test:integration
npm run test:coverage
```

### Focused security suites

```bash
# V1, V2, V10 and OpenID Connect
npm test -- --runInBand tests/integration/security.member1.test.js

# V3, V4 and V5
npm test -- --runInBand \
  tests/unit/authController.security.test.js \
  tests/unit/profileMassAssignment.security.test.js \
  tests/unit/messageContoller.test.js \
  tests/integration/registrationSecurity.test.js \
  tests/integration/adminAuthorization.test.js \
  tests/integration/accessControl.test.js

# V6, V7 and V14
npm test -- --runInBand tests/integration/security.member3.test.js

# V9, V11, V12 and V13
npm test -- --runInBand tests/integration/security.member4.test.js
```

Recorded focused results:

| Scope | Result |
|---|---:|
| Member 1 V1/V2/V10/OIDC security tests | 30 passed, 0 failed |
| Member 2 focused V3/V4/V5 unit tests | 16 passed |
| Member 2 targeted V3/V4 integration tests | 39 passed |
| Member 3 V6/V7/V14 security tests | 39 passed, 0 failed |
| Member 4 V9/V11/V12/V13 security tests | 29 passed, 0 failed |

Some older broad regression fixtures expect a previous authorization message or submit passwords that no longer meet the strengthened policy. These are documented in the member evidence; security controls were not weakened to satisfy stale fixtures.

### Frontend checks

```bash
cd Client
npm run lint
npm run build
```

### Manual OIDC verification

1. Confirm the authorization redirect contains `state`, `nonce`, `code_challenge`, and `code_challenge_method=S256`.
2. Complete sign-in and confirm no JWT or full user object appears in the URL/history.
3. Confirm the frontend exchanges the code through `POST /api/google-oauth/exchange`.
4. Attempt to reuse the code; the server must reject it.
5. Test cancelled login, missing cookie, modified state, expiry, and account conflict.
6. Confirm `role=admin` tampering cannot create an administrator.

## API overview

All application routes use the `/api` prefix.

| Area | Base route | Examples |
|---|---|---|
| Authentication | `/api/auth` | register, login, logout, reset, profile, admin management |
| OpenID Connect | `/api/google-oauth` | start, callback, one-time code exchange |
| Help requests | `/api/messages` | create, list, update, delete |
| Tutoring sessions | `/api/tutoring-sessions` | list, create, update, delete, join, leave |
| Tutors | `/api/tutors` | tutors, subjects, protected student lists |
| Materials | `/api/materials` | browse, upload, edit, delete, download, like |
| Feedback | `/api/feedbacks` | submit, review, ratings, admin operations |
| Progress | `/api/progress` | upsert, personal/tutor/admin views |
| Email | `/api/email` | protected email functions |
| Google Calendar | `/api/google-calendar` | protected authorization, callback, events, status |

Protected requests use the authentication cookie and/or supported `Authorization: Bearer <token>` header. Never place tokens in query strings or logs.

## Evidence and commit traceability

### Evidence locations

- Member 1: [`docs/IT23472020_member1_evidence/final/Final_Manifest.md`](docs/IT23472020_member1_evidence/final/Final_Manifest.md)
- Member 2: [`docs/security/member2-chiran-summary.md`](docs/security/member2-chiran-summary.md) and the V3/V4/V5 reports.
- Member 3: [`docs/member3_evidence/Final_Manifest.md`](docs/member3_evidence/Final_Manifest.md) and [`docs/member3_evidence/final/Evidence_Index.md`](docs/member3_evidence/final/Evidence_Index.md).
- Member 4: [`docs/member4_evidence/Final_Manifest.md`](docs/member4_evidence/Final_Manifest.md), [`docs/member4_evidence/final/Evidence_Index.md`](docs/member4_evidence/final/Evidence_Index.md), and [Member 4 discussion](docs/member4_evidence/final/Member4_Discussion.md).

### Main security commits

| Owner | Work | Commit |
|---|---|---|
| Maduwantha | V1 Google sign-up role restriction | `16f41c6` |
| Maduwantha | V2 safe redirect/login ticket | `d1b94a8` |
| Maduwantha | V10 authentication rate limiting | `cca5cdd` |
| Maduwantha | OpenID Connect + PKCE | `a1a095e` |
| Serasinghe | V3 registration restriction | `aeec250` |
| Serasinghe | V4 administrator authorization | `e577140` |
| Serasinghe | V5 mass-assignment prevention | `890753f` |
| Alahakoon | V8 secret/config hardening | `0e4313a` |
| Alahakoon | V6 session data protection | `e4e1b68` |
| Alahakoon | V7 email/calendar protection | `a1e1d4c` |
| Alahakoon | V14 ReDoS prevention | `8f42865` |
| Nimadith | V9 safe logging/errors | `0d10957` |
| Nimadith | V11 enumeration prevention | `b95bf3b` |
| Nimadith | V12 password/seed hardening | `c1aa944` |
| Nimadith | V13 headers/cookies | `aaf015f` |

Use `git show <commit>` or the manifests to inspect focused changes. Never restore a historical secret merely to demonstrate a vulnerability.

## Known residual risks

### U1 — browser token storage and server-side logout invalidation

The client still supports JWT storage in `sessionStorage`/`localStorage`, and logout does not maintain a server-side deny-list. Removing this risk requires an end-to-end HttpOnly-cookie-only design, CSRF review, refresh/rotation strategy, and server-side revocation or token versioning. Exposure is reduced by removing tokens from OAuth redirect URLs and protecting cookies where issued.

### U2 — dependency upgrades with breaking changes

Audit findings requiring major upgrades need regression testing rather than blind replacement. Record each package/advisory, prioritize exploitability, upgrade on a maintenance branch, then rerun all unit, integration, security, and frontend checks.

### V8 historical credential revocation

The current tree no longer tracks `google-tokens.json` or uses hard-coded secret fallbacks. Deleting a credential does not invalidate historical copies: the legitimate Google account owner must confirm revocation/rotation. Coordinated history rewriting, if selected, does not replace credential revocation.

## Deployment and submission links

| Resource | Link/status |
|---|---|
| Source repository | [ChiranLK-Quality-Education-Secure-SE4030](https://github.com/ChiranLK/ChiranLK-Quality-Education-Secure-SE4030) |
| Recorded frontend deployment | [quality-education-six.vercel.app](https://quality-education-six.vercel.app) |
| Recorded backend deployment | [quality-education-8hz3.onrender.com](https://quality-education-8hz3.onrender.com) |
| Demonstration video | Add the final unlisted YouTube URL before course submission |
| Final report | Add the submitted PDF/report link or package path |

Before submission, verify both deployment URLs, confirm no production secret appears in evidence, add the final video/report links, and keep the demonstration within the 20-minute limit.

---

Developed by **Maduwantha H.A.S. (IT23472020)**, **Serasinghe C.S. (IT23401976)**, **Alahakoon P.B. (IT23405240)**, and **Nimadith L.M.H. (IT23242272)** for SE4030 Secure Software Development.
