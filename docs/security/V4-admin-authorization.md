# V4 — Inconsistent authorization on administrator endpoints

## Classification

| Field | Value |
| --- | --- |
| Vulnerability ID | V4 |
| Vulnerability name | Administrator endpoints authenticated users without consistently authorizing the administrator role |
| OWASP category | A01: Broken Access Control |
| CWE | CWE-285: Improper Authorization |
| Severity | Critical |
| Responsible member | Chiran |
| Remediation commit | `e577140` |
| Regression-test commit | `4d48d94` |

## Affected original files and endpoints

The original route declarations in these files applied authentication but omitted a consistent administrator-role guard:

- `backend/Routes/authRouter.js`
- `backend/Routes/feedbackRouter.js`
- `backend/Routes/progressRouter.js`

Confirmed privileged endpoints:

| Method | Endpoint | Privileged operation |
| --- | --- | --- |
| GET | `/api/auth/all-users` | List all users |
| DELETE | `/api/auth/users/:userId` | Delete another user |
| POST | `/api/auth/setup-admin` | Provision an administrator through the setup path |
| POST | `/api/auth/create-admin` | Create an administrator |
| GET | `/api/feedbacks` | List all feedback |
| POST | `/api/feedbacks/admin/create` | Create feedback as administrator |
| PUT | `/api/feedbacks/admin/:id` | Update feedback as administrator |
| GET | `/api/progress/admin/all` | List all progress records |

## Original vulnerable behaviour

These routes used `protect`, which established that a request was authenticated, but did not consistently call `authorizePermissions("admin")`. An authenticated student or tutor could therefore reach handlers intended for administrators. Any controller-local checks were inconsistent and created gaps when routes or handlers changed.

The setup and create-admin endpoints were especially sensitive because they could provision additional privileged accounts.

## Safe reproduction steps

Use a disposable local test database with synthetic `user`, `tutor`, and `admin` accounts.

1. On the pre-fix revision, authenticate as a synthetic normal user.
2. Request one of the listed administrator endpoints with that user's test token.
3. Observe that the router admits the request because it checks authentication without consistently checking the `admin` role.
4. Repeat with a tutor test identity and with a request body containing `"role": "admin"`.
5. Compare with an unauthenticated request and a legitimate administrator request.

Never capture or publish the token used for a test.

## Impact

An authenticated non-administrator could potentially enumerate users, access all feedback or progress information, delete users, or provision administrators. This crosses tenant and role boundaries and can result in confidentiality, integrity, and availability loss. The assigned severity is Critical.

## Root cause

- Authentication and authorization were treated as equivalent controls.
- Privileged route declarations did not consistently apply the shared role middleware.
- Authorization decisions were distributed across handlers rather than enforced at the route boundary.
- Sensitive setup/provisioning endpoints remained reachable by any authenticated role.

## Implemented remediation

- Reused the centralized `authorizePermissions(...roles)` middleware.
- Applied middleware in the correct order: authentication first, administrator authorization second, controller last.
- Protected all eight confirmed administrator-only routes with `authorizePermissions("admin")`.
- Required an existing authenticated administrator for both setup-admin and create-admin operations.
- Preserved successful administrator behavior and existing response structures.
- Ensured request-body role manipulation cannot replace the authenticated identity's role.

The verified response policy is:

- No valid authentication: HTTP 401.
- Authenticated `user` or `tutor`: HTTP 403.
- Authenticated `admin`: request proceeds to the controller.

## Security test cases

Automated coverage is in:

- `backend/tests/integration/adminAuthorization.test.js`
- `backend/tests/integration/accessControl.test.js`
- `backend/tests/unit/authMiddleware.test.js`

The tests verify:

- Each confirmed administrator route rejects unauthenticated requests with 401.
- Students and tutors receive 403.
- Administrators can list users, feedback, and progress.
- Administrators can delete a user.
- Only administrators can use setup-admin and create-admin.
- Administrators retain feedback creation/update functionality.
- A non-administrator cannot bypass authorization by submitting `role: "admin"` in the body.

## Expected before-fix result

An authenticated non-administrator could pass the route's authentication middleware and reach one or more privileged controllers because the route did not enforce the administrator role.

## Verified after-fix result

Verified on 2026-09-25:

- The dedicated registration and administrator authorization integration run passed **3 suites and 39 tests**.
- Relevant middleware, feedback-controller, and progress-controller unit regressions passed **3 suites and 70 tests**.
- Source inspection confirmed all eight routes apply authentication before `authorizePermissions("admin")`.

The broader legacy integration run passed **63 of 65 tests**. Its two failures are stale expectations, not authorization bypasses: the progress suite expects an older controller-specific 403 message instead of the centralized middleware message, and the help-request suite uses the unsupported role string `student` rather than the model's `user` role. No implementation or other member's tests were changed for documentation work.

## Prevention practices

- Enforce authorization at the route boundary for every privileged operation.
- Keep authentication and role authorization as separate middleware stages.
- Default to denial when an endpoint's role policy is not explicit.
- Maintain a reviewed inventory of administrator endpoints.
- Test 401, 403, and permitted administrator paths for every privileged route.
- Derive authorization from the verified server-side identity, never from request-body fields.
- Include setup, bootstrap, and administrative provisioning routes in access-control reviews.

## Optional manual evidence placeholder

If screenshots are required by the assessment, capture:

- `V4-admin-authorization-tests.png` — terminal output showing `adminAuthorization.test.js` and `accessControl.test.js` passing.
- `V4-role-response-matrix.png` — sanitized local test-client responses showing 401 without authentication, 403 for a synthetic normal user, and a successful response for a synthetic administrator. Hide all headers, cookies, tokens, credentials, and personal data.
