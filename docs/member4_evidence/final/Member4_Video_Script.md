# Member 4 Video Script

## Recording safety checklist

- Display **NIMADITH LMH — IT23242272** on screen at the start of both segments.
- Use the cropped PNGs in the Member 4 evidence directory; do not open a real environment file.
- Never show token values, passwords, cookie values, client secrets, personal email addresses, or personal account data.
- Describe baseline screenshots as source inspection, not as runtime tests.
- Show the genuine test summary: 29 passed, 0 failed, exit code 0.

## 9:30–12:30 — Member 4 vulnerabilities

### 9:30–9:40 — Introduction

**Show:** Name, student ID, branch name, and [`Evidence_Index.md`](Evidence_Index.md).

**Say:**

“I am NIMADITH LMH, student ID IT23242272. My independent Member 4 work covers V9, V11, V12, and V13. All before images come from baseline commit `23faaa1`. The images are cropped and secret-safe.”

### 9:40–10:20 — V9

**Show:** `V9_BEFORE_SENSITIVE_LOGGING.png`, `V9_BEFORE_STACK_TRACE_RESPONSE.png`, then the two V9 after images and `V9_TEST_RESULTS.png`.

**Say:**

“V9 is tokens in logs and stack traces in client responses. It maps to OWASP A09:2021, CWE-532 and CWE-209. The baseline source allowed sensitive values and internal stack details to cross trust boundaries. That could expose credentials, user information, server paths, and implementation details.

In fix commit `0d109570`, I replaced sensitive object logging with minimal allow-listed events. Production server errors now return a generic message. Development diagnostics remain controlled and credential-safe. The V9 tests passed: 5 passed and 0 failed.”

### 10:20–11:00 — V11

**Show:** The two V11 before images, the uniform/no-role after images, and `V11_TEST_RESULTS.png`.

**Say:**

“V11 is email and role enumeration through `/check-email`. It maps to OWASP A07:2021 and CWE-204. Before the fix, different results revealed whether an account existed, and an existing user’s role was returned. Attackers could use this for phishing or credential attacks.

In fix commit `b95bf3b`, the endpoint validates and normalizes email input, but it does not look up the account. Every valid email receives the same status and generic response. No email or role is disclosed. Registration and login still work. The V11 tests passed: 4 passed and 0 failed.”

### 11:00–11:45 — V12

**Show:** `V12_BEFORE_WEAK_POLICY.png`, the redacted seed image, both V12 after images, and `V12_TEST_RESULTS.png`.

**Say:**

“V12 is weak password policy and insecure seed credentials. It maps to OWASP A07:2021 and CWE-521. The baseline used weak, duplicated rules and source-controlled seed credentials. This increases guessing, cracking, and credential reuse risk. The baseline seed screenshot is redacted; I will not display the old values.

In fix commit `c1aa944`, I added one reusable server-side policy. It requires at least eight characters, uppercase, lowercase, a number, and a special character. Registration and reset or change processing use the same rule. Bcrypt uses cost 12. Seed credentials now come from environment variables, and missing or weak configuration safely skips account creation. The V12 tests passed: 12 passed and 0 failed.”

### 11:45–12:20 — V13

**Show:** The two V13 before images, both V13 after images, and `V13_TEST_RESULTS.png`.

**Say:**

“V13 is missing security headers and insecure cookie configuration. It maps to OWASP A05:2021 and CWE-693. Without consistent headers and cookie options, the browser had weaker protection against framing, MIME sniffing, and session misuse.

In fix commit `aaf015f`, Helmet was registered before application routes. It adds Content-Security-Policy, `nosniff`, and frame denial. Authentication cookies now use HttpOnly, SameSite Lax, a 24-hour lifetime, and Secure in production. Logout clears the cookie with matching attributes. CORS, API, media, and the mocked OIDC redirect remain functional. The V13 tests passed: 8 passed and 0 failed.”

### 12:20–12:30 — Test summary

**Show:** `Git/MEMBER4_FINAL_TEST_SUMMARY.png`.

**Say:**

“The dedicated Member 4 regression suite passed all 29 tests: V9 has 5, V11 has 4, V12 has 12, and V13 has 8. There were zero failures and the exit code was zero. External Google, email, calendar, user storage, and token boundaries were mocked.”

## 17:30–18:30 — Unresolved findings and prevention

### 17:30–17:50 — U1 and U2

**Show:** A plain slide reading “U1 — NOT FIXED” and “U2 — NOT FIXED.” Do not show unverified technical titles.

**Say:**

“U1 and U2 are group-level findings, not Member 4 fixes. In this branch, there is no tracked definition, verified fix commit, test, or evidence record for either label. Their accurate status is not fixed. The group must confirm their definitions, ownership, and acceptance tests. I do not claim that Member 4 fixed U1 or U2.”

### 17:50–18:25 — Preventive secure development

**Show:** A short slide with STRIDE, ASVS, scanning, tests, and review.

**Say:**

“Future work should start with STRIDE threat modelling and use OWASP ASVS as a verification checklist. Security should deny by default: allow-list safe log fields, use generic production errors, give uniform identity responses, centralize password and cookie rules, and keep credentials in protected environment configuration.

The delivery pipeline should run SAST, DAST on a safe test deployment, secret scanning, dependency scanning, and focused security regression tests. Code review must check logs, errors, enumeration, password writes, seed configuration, middleware order, cookies, CORS, and OIDC behavior. Any reported scanner result must be genuine and retained as evidence.”

### 18:25–18:30 — Close

**Show:** “NIMADITH LMH — IT23242272” and the evidence directory.

**Say:**

“This completes my Member 4 contribution. The evidence is under `docs/member4_evidence`, and no real secrets or personal account data are included.”
