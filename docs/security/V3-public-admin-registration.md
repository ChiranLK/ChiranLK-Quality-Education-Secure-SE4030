# V3 — Public registration allowed administrator role assignment

## Classification

| Field | Value |
| --- | --- |
| Vulnerability ID | V3 |
| Vulnerability name | Public registration allowed users to register with the administrator role |
| OWASP category | A01: Broken Access Control |
| CWE | CWE-269: Improper Privilege Management |
| Severity | Critical |
| Responsible member | Chiran |
| Remediation commit | `aeec250` |
| Regression-test commit | `4d48d94` |

## Affected original files and endpoint

- `backend/Controllers/authController.js` — `register` controller.
- `backend/Middleware/ValidatorMiddleware.js` — public registration validation.
- `POST /api/auth/register` — public email/password registration for students and tutors.

The `User` model defines the real role values as `user`, `admin`, and `tutor`. Public self-registration should expose only `user` and `tutor`.

## Original vulnerable behaviour

The public registration validator accepted `admin`. The controller also honored a submitted `role: "admin"`, and its first-account logic could promote the first public registrant to administrator. It then passed the mutable request body to `User.create`, allowing unrelated client-supplied fields to reach model creation.

This meant an unauthenticated caller could request an administrator account through a public endpoint instead of using an authenticated administrative provisioning flow.

## Safe reproduction steps

Use only a disposable local test database and synthetic data.

1. Start the pre-fix application in a test environment.
2. Send `POST /api/auth/register` with otherwise valid synthetic registration data and `"role": "admin"`.
3. Observe that the request can create an account whose stored role is `admin`. The original first-account path could also assign `admin` when no role was supplied.
4. Repeat with privileged fields such as `isVerified`, `googleId`, `permissions`, or a client-selected `_id` and inspect the stored test document.

Do not perform this test against production or use a real identity, credential, or token.

## Impact

Successful exploitation could create an administrative identity without prior authorization. That identity could then access privileged routes, read administrative data, create other administrators, or delete users. Because the vulnerable path was public and led directly to privilege escalation, the assigned severity is Critical.

## Root cause

- The validation layer treated `admin` as a valid public registration role.
- The controller trusted the client-selected role.
- The first-account bootstrap behavior implicitly granted administrator privileges.
- The controller used the request body as the persistence object instead of constructing a new object from approved fields.

## Implemented remediation

- Added an explicit public self-registration allow-list: `user` and `tutor` only.
- Defaulted an omitted role to `user`.
- Rejected privileged or unknown roles with HTTP 400 and the safe message `Invalid role for self-registration`.
- Removed public first-account administrator promotion.
- Built `userData` from named fields rather than passing `req.body` to `User.create`.
- Preserved student grade registration and tutor subject registration.
- Created tutor verification, rating, availability, and session defaults on the server.
- Continued hashing the password before persistence.
- Restricted the registration validator to `user` and `tutor`.

Administrator creation remains available only through authenticated, administrator-authorized endpoints covered by V4.

## Security test cases

Automated coverage is in:

- `backend/tests/integration/registrationSecurity.test.js`
- `backend/tests/integration/accessControl.test.js`
- `backend/tests/unit/authController.security.test.js`

The tests verify:

- Valid `user` registration returns 201.
- Valid `tutor` registration returns 201 with controlled tutor defaults.
- An omitted role defaults to `user`.
- `admin` and an unknown role are rejected with 400 and no account is created.
- Privileged and internal fields are not persisted.
- The password is stored as a hash and still verifies using bcrypt.
- Student and tutor registration behavior remains operational.

## Expected before-fix result

A valid public request specifying `role: "admin"` could be accepted and persisted as an administrator. A first public account could also become an administrator implicitly, and additional request properties could reach user creation.

## Verified after-fix result

Verified on 2026-09-25:

- The dedicated registration/access-control integration suites passed as part of a 3-suite run: **39 tests passed**.
- The focused security unit suites passed as part of a 3-suite run: **16 tests passed**.
- Source inspection confirmed that `User.create` receives only the server-created `userData` object and that the validator and controller both enforce the same public role allow-list.

## Prevention practices

- Treat role and privilege fields as server-controlled data.
- Use explicit allow-lists at both request validation and persistence boundaries.
- Keep public self-registration separate from administrator provisioning.
- Never use the complete request body as a Mongoose create payload.
- Add a negative regression test whenever a new role or account-state field is introduced.
- Review defaults and bootstrap flows for implicit privilege assignment.

## Optional manual evidence placeholder

If screenshots are required by the assessment, capture:

- `V3-registration-security-tests.png` — terminal output showing `registrationSecurity.test.js` and `authController.security.test.js` passing.
- `V3-admin-registration-rejected.png` — a local test-client response showing HTTP 400 for a synthetic `role: "admin"` request, with all authorization headers, cookies, credentials, and environment values hidden.
