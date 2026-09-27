# Member 2 Security Summary — Chiran

## Responsibilities

Chiran was responsible for three access-control vulnerabilities in TutorConnect / Quality-Education:

- V3: prevent public administrator registration.
- V4: enforce administrator authorization on privileged backend routes.
- V5: prevent mass assignment in profile and academic help-request updates.

The work did not change OpenID Connect, OAuth callbacks, token exchange, rate limiting, Google email/calendar authorization, committed Google tokens, regex search, global logging, password policy, Helmet, or cookie settings.

## Vulnerability overview

| ID | Vulnerability | Classification | Severity | Main remediation |
| --- | --- | --- | --- | --- |
| V3 | Public registration allowed administrator role assignment | OWASP A01 / CWE-269 | Critical | Restricted public roles to `user` and `tutor`; created users from named fields only |
| V4 | Administrator routes lacked consistent role authorization | OWASP A01 / CWE-285 | Critical | Applied centralized administrator authorization after authentication |
| V5 | Profile and help-request updates permitted mass assignment | OWASP A01 / CWE-915 | High | Added update allow-lists, ownership checks, correct status codes, and Mongoose validation |

## Files changed by the confirmed commits

### V3 implementation and tests

- `backend/Controllers/authController.js`
- `backend/Middleware/ValidatorMiddleware.js`
- `backend/tests/integration/registrationSecurity.test.js`

### V4 implementation and tests

- `backend/Routes/authRouter.js`
- `backend/Routes/feedbackRouter.js`
- `backend/Routes/progressRouter.js`
- `backend/tests/integration/adminAuthorization.test.js`

### Shared V3/V4 regression coverage

- `backend/tests/integration/accessControl.test.js`
- `backend/tests/unit/authController.security.test.js`

### V5 implementation and tests

- `backend/Controllers/authController.js`
- `backend/Controllers/messageContoller.js`
- `backend/tests/unit/messageContoller.test.js`
- `backend/tests/unit/profileMassAssignment.security.test.js`

## Security controls added

- Explicit public-registration role allow-list: `user`, `tutor`.
- Server-created user registration object containing named permitted fields only.
- Server-controlled tutor verification, rating, availability, and session defaults.
- Password hashing preserved before user persistence.
- Central `authorizePermissions("admin")` enforcement on eight confirmed privileged routes.
- Authentication-before-authorization middleware ordering.
- Profile update allow-lists for normal and tutor-specific fields.
- Help-request update allow-list for `title`, `message`, `category`, and `language`.
- Help-request ownership verification using the authenticated user ID.
- 401/403/404 response separation for authentication, ownership, and missing-resource cases.
- `runValidators: true` on profile and help-request updates.
- Regression tests for privilege injection, body-role manipulation, protected fields, ownership, and valid behavior.

## Tests performed

Verification date: 2026-09-25.

### Focused V3/V4/V5 unit tests

```text
npm test -- --runInBand tests/unit/authController.security.test.js tests/unit/profileMassAssignment.security.test.js tests/unit/messageContoller.test.js
```

Result: **3 suites passed; 16 tests passed**.

### Targeted V3/V4 integration tests

```text
npm test -- --runInBand tests/integration/registrationSecurity.test.js tests/integration/adminAuthorization.test.js tests/integration/accessControl.test.js
```

Result: **3 suites passed; 39 tests passed**.

### Relevant backend unit regressions

```text
npm test -- --runInBand tests/unit/authMiddleware.test.js tests/unit/feedbackController.test.js tests/unit/progressController.test.js
```

Result: **3 suites passed; 70 tests passed**.

### Relevant backend integration regressions

The first run without a test JWT environment value produced authentication failures because the legacy suites sign with a fallback secret while middleware requires `JWT_SECRET`. The suites were rerun with a synthetic process-only test value; no environment file or application code was changed.

```text
JWT_SECRET=<synthetic-test-value> npm test -- --runInBand tests/integration/feedback.test.js tests/integration/progress.test.js tests/integration/helpRequest.test.js
```

Result: **1 suite passed, 2 suites failed; 63 tests passed, 2 tests failed**.

The remaining failures are stale test expectations:

1. `progress.test.js` expects the former controller-specific 403 message, while the centralized V4 middleware correctly returns `Not authorized to access this route`.
2. `helpRequest.test.js` creates a token with legacy role `student`; the `User` model and message route use `user`, so the route correctly returns 403, but one assertion does not include 403 in its accepted status list.

These tests belong outside this documentation-only change and were not modified. All dedicated V3, V4, and V5 security suites passed.

## Commit hashes

- `aeec250` — `security(registration): prevent public admin role assignment`
- `e577140` — `security(admin): enforce authorization on privileged routes`
- `4d48d94` — `test(security): add registration and access-control regression coverage`
- `890753f` — `security(updates): prevent mass assignment in profiles and help requests`

## Brief viva explanations

### V3

The vulnerability was privilege assignment through a public trust boundary. The API accepted an administrator role from an unauthenticated registration body and could also promote the first account. The fix allows only the model's normal self-registration roles (`user` and `tutor`) and constructs the database object from named fields, so clients cannot select privileged or internal state.

### V4

Authentication answers “who is calling,” while authorization answers “may this identity perform this action.” Several administrator routes answered only the first question. The fix places the shared administrator-role guard after authentication on every confirmed privileged route, producing 401 for no identity, 403 for the wrong role, and normal behavior for an administrator.

### V5

Mass assignment occurs when client-controlled object properties flow into a database operation without a strict field policy. The profile path accepted a whole nested tutor object, and the help-request path spread the entire body into an update. The fix builds new update objects from allow-lists, protects ownership and system fields, checks the existing resource owner, and enables Mongoose validators.

## Remaining limitations

- V5 update security is covered with controller-level unit tests that assert exact Mongoose update objects and status behavior; a dedicated end-to-end PATCH integration suite was not added.
- Two legacy integration assertions require maintenance as described above, although all dedicated Member 2 security suites pass.
- Browser/API-client screenshots are not stored in the repository. They should be captured manually only if required by the assessment and must be sanitized.
- Security controls should be revisited whenever new roles, privileged routes, profile fields, or help-request fields are introduced.

## Recommended manual evidence placeholders

If visual evidence is required, capture these sanitized screenshots:

- `V3-registration-security-tests.png` — passing registration security tests.
- `V3-admin-registration-rejected.png` — HTTP 400 for synthetic public admin registration.
- `V4-admin-authorization-tests.png` — passing administrator authorization tests.
- `V4-role-response-matrix.png` — 401 unauthenticated, 403 non-admin, and successful administrator access.
- `V5-mass-assignment-tests.png` — passing profile/help-request mass-assignment tests.
- `V5-profile-protected-fields.png` — protected profile values unchanged after a synthetic update attempt.
- `V5-help-request-ownership.png` — owner succeeds and a different synthetic user receives 403.

Before capturing, hide authorization headers, cookies, tokens, credentials, `.env` values, database connection strings, and any real personal information.
