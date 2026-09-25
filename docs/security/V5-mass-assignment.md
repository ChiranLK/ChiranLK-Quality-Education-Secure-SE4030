# V5 — Mass assignment in profile and help-request updates

## Classification

| Field | Value |
| --- | --- |
| Vulnerability ID | V5 |
| Vulnerability name | Mass assignment in profile and academic help-request updates |
| OWASP category | A01: Broken Access Control |
| CWE | CWE-915: Improperly Controlled Modification of Dynamically Determined Object Attributes |
| Severity | High |
| Responsible member | Chiran |
| Remediation commit | `890753f` |

## Affected original files and endpoints

- `backend/Controllers/authController.js` — `updateProfile`.
- `backend/Controllers/messageContoller.js` — `updateMessage` for the academic help-request board.
- `backend/Routes/authRouter.js` — `PUT /api/auth/profile`.
- `backend/Routes/messageRouter.js` — `PATCH /api/messages/:id`.

This feature is an academic help-request board; it is not a real-time chat system.

## Original vulnerable behaviour

The profile controller selected several top-level fields but assigned the submitted `tutorProfile` object as a whole. A tutor could therefore attempt to modify nested server-managed attributes such as verification state, rating counters, or session count.

The help-request update controller copied all request properties with `{ ...req.body }` and passed the result to `findByIdAndUpdate`. Although it checked the existing record's owner first, an owner could include protected fields such as `createdBy`, `senderId`, translation metadata, or timestamps in the update and alter ownership or system state.

The update error handling also returned 400 for both a missing request and a non-owner, rather than the verified 404 and 403 semantics.

## Safe reproduction steps

Use only synthetic users and records in a disposable local database.

Profile path on the pre-fix revision:

1. Authenticate as a synthetic tutor.
2. Send `PUT /api/auth/profile` with a legitimate profile change plus nested values such as `tutorProfile.isVerified`, `tutorProfile.rating`, or `tutorProfile.sessionCount`.
3. Inspect the test document and observe that the complete nested object could reach the update.

Help-request path on the pre-fix revision:

1. Create a synthetic help request as test user A.
2. As user A, send `PATCH /api/messages/:id` with a legitimate title change plus a different `createdBy` or another protected property.
3. Inspect the update payload or resulting test document and observe that unrestricted request properties could reach Mongoose.
4. As test user B, attempt to update user A's request to confirm the ownership boundary under test.

Do not use production records, real identities, real tokens, or real credentials.

## Impact

Profile mass assignment could let a tutor claim verification, manipulate rating information, or change other system-maintained state. Help-request mass assignment could change ownership and metadata, corrupt audit history, and interfere with future authorization decisions. The assigned severity is High.

## Root cause

- A nested client object was treated as a safe profile update object.
- The help-request controller used an unrestricted spread of `req.body`.
- Persistence updates were not constructed solely from approved client-editable fields.
- Ownership and not-found errors did not use distinct authorization/resource status codes.

## Implemented remediation

### Profile update allow-list

Top-level fields:

- `fullName`
- `email`
- `phoneNumber`
- `location`
- `grade`

Tutor-only nested fields, written using explicit dotted paths:

- `subjects`
- `bio`
- `experience`
- `qualifications`
- `specializations`
- `hourlyRate`
- `availability`
- `languages`

The general profile endpoint does not accept role/admin state, verification, ratings, session counts, passwords or password hashes, OAuth identifiers, reset data, account/internal flags, permissions, avatar state, `_id`, or timestamps. Student requests cannot create tutor-profile data. Protected-only requests are rejected with HTTP 400. Mongoose updates use `runValidators: true`.

### Help-request update allow-list and ownership

Client-editable fields are limited to:

- `title`
- `message`
- `category`
- `language`

The server may derive `requiresTranslation` when message content is processed, but the client cannot assign it directly. Ownership identifiers (`createdBy`, `owner`, `userId`, `studentId`, and `tutorId`), `senderId`, timestamps, and unknown fields are excluded from the database update.

The controller loads the existing request and compares `createdBy` with the authenticated `userId` before updating. Missing authentication is rejected before the controller with 401, a non-owner receives 403, and a nonexistent request receives 404. The existing route permits the `user` role only; no new administrator override was introduced. Updates use `runValidators: true`.

## Security test cases

Automated coverage is in:

- `backend/tests/unit/profileMassAssignment.security.test.js`
- `backend/tests/unit/messageContoller.test.js`

The tests verify:

- Legitimate student profile fields update successfully.
- Legitimate tutor profile fields update successfully.
- Role/admin, verification, ratings, OAuth identifiers, passwords, internal fields, IDs, and timestamps do not reach the profile update.
- A profile request containing only protected fields receives 400.
- Legitimate help-request fields update successfully.
- Ownership and system-managed fields do not reach the help-request update.
- Protected-only help-request updates receive 400.
- Another student receives 403 and no update occurs.
- Missing authentication produces a 401 error before controller access.
- A nonexistent help request receives 404.
- Both update operations enable Mongoose validation.

## Expected before-fix result

A tutor's complete submitted `tutorProfile` object could replace nested profile state, including server-managed values. A help-request owner could include arbitrary request properties in the Mongoose update, including a new `createdBy`, because the database update was constructed by spreading `req.body`.

## Verified after-fix result

Verified on 2026-09-25:

- The focused security unit run passed **3 suites and 16 tests**, including all profile and help-request mass-assignment tests.
- Static inspection confirmed both controllers construct new update objects from explicit allow-lists and pass `runValidators: true`.
- The unsafe help-request `{ ...req.body }` update pattern is no longer present.
- The relevant controller/middleware unit regression run passed **3 suites and 70 tests**.

The existing broad integration run passed **63 of 65 tests**. One unrelated help-request creation assertion uses the invalid legacy role `student` and omits 403 from one accepted-status list; the other stale assertion expects the former progress-controller authorization message. These do not contradict the dedicated V5 update tests and were not changed because they fall outside this documentation-only scope.

## Prevention practices

- Build create and update payloads from explicit allow-lists.
- Avoid spreading `req.body`, unrestricted `$set`, and whole-object assignment into persistence calls.
- Separate user-editable, role-specific, and system-managed fields.
- Check resource ownership against the authenticated server-side identity before mutation.
- Use 401 for missing authentication, 403 for failed ownership/authorization, and 404 for missing resources.
- Enable Mongoose validators for update operations.
- Add negative tests for every new privileged, ownership, identity-provider, or audit field.

## Optional manual evidence placeholder

If screenshots are required by the assessment, capture:

- `V5-mass-assignment-tests.png` — terminal output showing `profileMassAssignment.security.test.js` and `messageContoller.test.js` passing.
- `V5-profile-protected-fields.png` — sanitized local evidence that a legitimate profile field changes while submitted role, verification, rating, OAuth, and password fields remain unchanged.
- `V5-help-request-ownership.png` — sanitized local evidence showing an owner update succeeding and another synthetic user receiving 403. Hide all tokens, cookies, credentials, personal data, and database connection details.
