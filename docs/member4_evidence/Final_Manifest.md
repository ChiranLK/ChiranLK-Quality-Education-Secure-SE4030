# Member 4 Final Security Evidence Manifest

## Identity and scope

- Member: NIMADITH LMH
- Student ID: IT23242272
- Branch: `security-fixes-IT23242272-NIMADITH-LMH`
- Baseline used for before-code evidence: `23faaa1eed6c88a90c8e8daf301d5e72b24966bb`
- Assigned vulnerabilities: V9, V11, V12, and V13
- Regression-test commit: `fa684f8c70fc9e5109880e67b49ebb23c2404f57`
- Evidence index: [`final/Evidence_Index.md`](final/Evidence_Index.md)

## Evidence integrity and safety

- Before-code images were rendered from the immutable baseline commit shown above. They are source-inspection evidence and are not described as runtime results.
- After-code images were rendered from committed Member 4 source at `fa684f8c70fc9e5109880e67b49ebb23c2404f57`.
- Test-result images were generated from a fresh Jest JSON run. The totals were parsed from Jest rather than typed into the renderer.
- The evidence run used mocks for user storage, JWT creation, email delivery, and Google OAuth. It did not contact real Google, email, or calendar services.
- No real `.env` contents, client secrets, authentication tokens, cookie values, passwords, or personal email addresses are retained.
- V12 baseline passwords, email addresses, names, phone numbers, and locations were replaced with visible redaction labels before rendering.
- V13 baseline cookie values were replaced with a visible `[VALUE REDACTED]` marker before rendering.
- Every retained PNG was reopened successfully with Chromium's image decoder. Machine-readable validation details are in [`final/png-validation.json`](final/png-validation.json).
- `MEMBER4_CLEAN_STATUS.png` records the genuine clean implementation tree immediately before the evidence files were created.

## Automated-test record

Evidence command:

```text
node --experimental-vm-modules ./node_modules/jest/bin/jest.js tests/integration/security.member4.test.js --runInBand --json
```

Fresh evidence run:

| Group | Passed | Failed |
|---|---:|---:|
| V9 | 5 | 0 |
| V11 | 4 | 0 |
| V12 | 12 | 0 |
| V13 | 8 | 0 |
| Overall | 29 | 0 |

- Test suites: 1 passed, 0 failed
- Process exit code: 0
- Evidence run used only synthetic `.test` identities and mocked external boundaries.

Directly affected pre-existing authentication tests were also run separately. Their genuine result was 9 passed and 2 failed (exit code 1). The two failures are older registration tests whose fixtures do not meet the required V12 password policy. Those tests were not modified, and the production policy was not weakened. This result is separate from the Member 4 regression suite above.

---

## V9 — Tokens in logs and stack traces in responses

1. **Description**
   Authentication tokens, decoded authentication data, complete user records, request data, and provider error objects could reach application logs. The centralized error handler could include stack traces in development responses, and several controllers returned internal exception messages directly.

2. **Root cause**
   Logging accepted arbitrary objects and sensitive values. Error-response construction reused raw exception fields without a strict public/server-side boundary.

3. **Security impact**
   Anyone with log access, or a client receiving a detailed error response, could obtain credentials, personal data, implementation paths, or information useful for further attacks.

4. **OWASP/CWE classification**
   OWASP A09:2021 — Security Logging and Monitoring Failures; CWE-532 — Insertion of Sensitive Information into Log File; CWE-209 — Generation of Error Message Containing Sensitive Information.

5. **Affected files/endpoints**
   Main affected components were `backend/utils/generateToken.js`, `backend/Middleware/authMiddleware.js`, `backend/Middleware/errorHandler.js`, authentication/email/feedback/progress/Google controllers, database and seed startup paths, mail/calendar/session services, and `backend/server.js`. The focused fix introduced `backend/utils/safeLogger.js` and `backend/Middleware/errorResponseSanitizer.js`. The complete file set is recorded by fix commit `0d109570a8a1b6b3df8ed607cf295ee09d275eb9`.

6. **Safe reproduction steps**
   Inspect the retained baseline screenshots, which show only source expressions and no historical runtime value. Then run the Member 4 suite and review V9 tests V9-T01 through V9-T05. Do not reproduce by submitting or printing real credentials.

7. **Before-fix evidence paths**

   - [`final/V9/V9_BEFORE_SENSITIVE_LOGGING.png`](final/V9/V9_BEFORE_SENSITIVE_LOGGING.png)
   - [`final/V9/V9_BEFORE_STACK_TRACE_RESPONSE.png`](final/V9/V9_BEFORE_STACK_TRACE_RESPONSE.png)

8. **Implemented fix**
   Replaced arbitrary logging with allow-listed structured events, omitted messages and credential-bearing objects from error logs, made development stack output explicit and opt-in, removed direct sensitive logs, centralized safe 5xx handling, and added last-line production response sanitization.

9. **After-fix verification**

   - [`final/V9/V9_AFTER_SANITIZED_LOGGING.png`](final/V9/V9_AFTER_SANITIZED_LOGGING.png)
   - [`final/V9/V9_AFTER_GENERIC_ERROR_RESPONSE.png`](final/V9/V9_AFTER_GENERIC_ERROR_RESPONSE.png)
   - Runtime tests confirm sensitive markers are excluded and production 500 responses contain no stack, source path, or internal exception detail.

10. **Genuine automated-test result**
    V9: 5 passed, 0 failed. See [`final/V9/V9_TEST_RESULTS.png`](final/V9/V9_TEST_RESULTS.png).

11. **Normal-functionality verification**
    The V9 group confirms normal safe 400 error handling remains functional. The wider Member 4 suite also exercises valid registration, login, reset, API, cookie, and OAuth redirect behavior.

12. **Main fix commit hash**
    `0d109570a8a1b6b3df8ed607cf295ee09d275eb9`

13. **Final status**
    Fixed and covered by Member 4 regression tests.

---

## V11 — Email and role enumeration through `/check-email`

1. **Description**
   `POST /api/auth/check-email` returned different status/body combinations for existing and non-existing accounts and disclosed the existing account's role.

2. **Root cause**
   A public compatibility endpoint performed a direct user lookup and exposed lookup results instead of returning a uniform acknowledgement.

3. **Security impact**
   An unauthenticated attacker could enumerate registered email addresses and learn account roles, improving phishing, credential-stuffing, and privilege-targeting attempts.

4. **OWASP/CWE classification**
   OWASP A07:2021 — Identification and Authentication Failures; CWE-204 — Observable Response Discrepancy.

5. **Affected files/endpoints**
   `backend/Controllers/authController.js`, function `checkEmail`; route `POST /api/auth/check-email` in `backend/Routes/authRouter.js`. Frontend inspection found no `/check-email` consumer under `Client/src`.

6. **Safe reproduction steps**
   Use the baseline source screenshots to compare the not-found and found branches without sending real addresses. Run V11-T01 through V11-T04 with the synthetic `.test` inputs in the Member 4 suite.

7. **Before-fix evidence paths**

   - [`final/V11/V11_BEFORE_ENUMERATION_CODE.png`](final/V11/V11_BEFORE_ENUMERATION_CODE.png)
   - [`final/V11/V11_BEFORE_DIFFERENT_RESPONSES.png`](final/V11/V11_BEFORE_DIFFERENT_RESPONSES.png)

8. **Implemented fix**
   Retained the endpoint for compatibility, normalized and validated email input server-side, removed the database lookup, and returned the same HTTP 200 generic body for every syntactically valid address. No email or role is returned.

9. **After-fix verification**

   - [`final/V11/V11_AFTER_UNIFORM_RESPONSE.png`](final/V11/V11_AFTER_UNIFORM_RESPONSE.png)
   - [`final/V11/V11_AFTER_NO_ROLE_DISCLOSURE.png`](final/V11/V11_AFTER_NO_ROLE_DISCLOSURE.png)
   - Tests compare valid existing/non-existing-shaped inputs and assert identical responses with no database lookup, role, or echoed email.

10. **Genuine automated-test result**
    V11: 4 passed, 0 failed. See [`final/V11/V11_TEST_RESULTS.png`](final/V11/V11_TEST_RESULTS.png).

11. **Normal-functionality verification**
    V11-T04 verifies valid registration and login still return successful responses while keeping passwords out of the returned user object.

12. **Main fix commit hash**
    `b95bf3b0b927cc15e6c5b0dfabb38810ef5f74b4`

13. **Final status**
    Fixed and covered by Member 4 regression tests.

---

## V12 — Weak password policy and insecure seed credentials

1. **Description**
   Registration/reset accepted weak six-character passwords, bcrypt used cost 10, and the seed script embedded reusable email/password credential pairs in source.

2. **Root cause**
   Password validation was duplicated and limited to length checks. Hashing cost and seed credentials were hard-coded instead of being governed by a reusable policy and environment configuration.

3. **Security impact**
   Weak passwords are easier to guess or crack, and committed seed credentials can be discovered and reused against local or deployed environments.

4. **OWASP/CWE classification**
   OWASP A07:2021 — Identification and Authentication Failures; CWE-521 — Weak Password Requirements.

5. **Affected files/endpoints**
   `backend/utils/passwordPolicy.js`, `backend/utils/passwordUtils.js`, `backend/Middleware/ValidatorMiddleware.js`, `backend/Controllers/authController.js`, `backend/models/UserModel.js`, `backend/seed-users.js`, and `backend/.env.example`. Enforcement covers public registration, admin creation, initial-admin setup, and `POST /api/auth/reset-password/:token`. No separate password-change endpoint exists in the current application.

6. **Safe reproduction steps**
   Use only the redacted baseline screenshot for seed credentials; do not print the historical baseline values. Run V12-T01 through V12-T09 with synthetic test passwords. Run the seed-missing test only with all seed variables explicitly empty and fetch mocked.

7. **Before-fix evidence paths**

   - [`final/V12/V12_BEFORE_WEAK_POLICY.png`](final/V12/V12_BEFORE_WEAK_POLICY.png)
   - [`final/V12/V12_BEFORE_HARDCODED_SEED_REDACTED.png`](final/V12/V12_BEFORE_HARDCODED_SEED_REDACTED.png)

8. **Implemented fix**
   Added one reusable policy requiring at least eight characters plus uppercase, lowercase, number, and non-whitespace special character. Applied it to registration/admin/reset paths, raised bcrypt cost to 12, replaced seed email/password literals with environment references, stopped seeding when required values are absent or weak, and added placeholder-only example variables.

9. **After-fix verification**

   - [`final/V12/V12_AFTER_PASSWORD_POLICY.png`](final/V12/V12_AFTER_PASSWORD_POLICY.png)
   - [`final/V12/V12_AFTER_SAFE_SEED_CONFIGURATION.png`](final/V12/V12_AFTER_SAFE_SEED_CONFIGURATION.png)
   - Tests cover every required character class, valid registration/reset hashing, response/log exclusion, missing seed configuration, and bcrypt rounds.

10. **Genuine automated-test result**
    V12: 12 passed, 0 failed. See [`final/V12/V12_TEST_RESULTS.png`](final/V12/V12_TEST_RESULTS.png).

11. **Normal-functionality verification**
    Strong-password registration succeeds; the reset/change flow hashes and saves a compliant password; bcrypt comparison succeeds at cost 12; login remains functional through V11/V13 tests.

12. **Main fix commit hash**
    `c1aa944926c455e3be0349387367eca390454ceb`

13. **Final status**
    Fixed and covered by Member 4 regression tests.

---

## V13 — Missing security headers and insecure cookie configuration

1. **Description**
   Express responses lacked a dedicated security-header layer. Authentication cookie attributes were duplicated and inconsistent, and logout overwrote the cookie instead of clearing it with matching attributes.

2. **Root cause**
   Helmet was not installed or registered, and each authentication path independently constructed cookie options.

3. **Security impact**
   Missing browser defenses increase exposure to MIME sniffing, framing/clickjacking, and unsafe content interpretation. Inconsistent cookies increase the chance of script access, cross-site delivery, insecure transport, or failed logout invalidation.

4. **OWASP/CWE classification**
   OWASP A05:2021 — Security Misconfiguration; CWE-693 — Protection Mechanism Failure.

5. **Affected files/endpoints**
   `backend/Middleware/securityHeaders.js`, `backend/utils/authCookie.js`, `backend/server.js`, `backend/Controllers/authController.js`, `backend/Controllers/googleAuthController.js`, `backend/package.json`, and `backend/package-lock.json`. Affected flows include login, logout, profile deletion, Google OAuth callback, API responses, and `/uploads` media.

6. **Safe reproduction steps**
   Inspect the baseline source screenshots for middleware order and redacted cookie configuration. Run V13-T01 through V13-T08 in the isolated Express test application; Google methods and user persistence are mocked.

7. **Before-fix evidence paths**

   - [`final/V13/V13_BEFORE_MISSING_HEADERS.png`](final/V13/V13_BEFORE_MISSING_HEADERS.png)
   - [`final/V13/V13_BEFORE_COOKIE_CONFIGURATION.png`](final/V13/V13_BEFORE_COOKIE_CONFIGURATION.png)

8. **Implemented fix**
   Installed Helmet and registered it before CORS, parsers, static files, and routes. Added a restrictive API CSP, `nosniff`, frame denial, production HSTS, cross-origin media compatibility, and an OAuth-compatible opener policy. Centralized cookies with `httpOnly`, `sameSite: "lax"`, production-only `secure`, path `/`, and a 24-hour `maxAge`; logout/profile deletion use `clearCookie` with matching base attributes.

9. **After-fix verification**

   - [`final/V13/V13_AFTER_HELMET_HEADERS.png`](final/V13/V13_AFTER_HELMET_HEADERS.png)
   - [`final/V13/V13_AFTER_SECURE_COOKIE_ATTRIBUTES.png`](final/V13/V13_AFTER_SECURE_COOKIE_ATTRIBUTES.png)
   - Runtime tests verify API headers, CSP/frame protection, login/logout attributes, production Secure behavior, credentialed CORS, and a mocked OAuth callback redirect.

10. **Genuine automated-test result**
    V13: 8 passed, 0 failed. See [`final/V13/V13_TEST_RESULTS.png`](final/V13/V13_TEST_RESULTS.png).

11. **Normal-functionality verification**
    API JSON returns HTTP 200, the mocked OIDC callback returns HTTP 302 to the configured frontend, credentialed CORS headers remain present, and cross-origin media policy remains usable.

12. **Main fix commit hash**
    `aaf015f72ef8687c74d0ec681cb62ef0330d15e4`

13. **Final status**
    Fixed and covered by Member 4 regression tests.

## Git evidence

- [`final/Git/MEMBER4_BRANCH.png`](final/Git/MEMBER4_BRANCH.png)
- [`final/Git/MEMBER4_FOCUSED_COMMITS.png`](final/Git/MEMBER4_FOCUSED_COMMITS.png)
- [`final/Git/MEMBER4_FINAL_TEST_SUMMARY.png`](final/Git/MEMBER4_FINAL_TEST_SUMMARY.png)
- [`final/Git/MEMBER4_CLEAN_STATUS.png`](final/Git/MEMBER4_CLEAN_STATUS.png)

No pull request was created as part of this evidence package.
