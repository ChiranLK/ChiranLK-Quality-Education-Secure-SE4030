# Member 4 Security Discussion

## Identity, scope, and evidence basis

- **Member:** NIMADITH LMH
- **Student ID:** IT23242272
- **Branch:** `security-fixes-IT23242272-NIMADITH-LMH`
- **Assigned findings:** V9, V11, V12, and V13
- **Baseline:** `23faaa1eed6c88a90c8e8daf301d5e72b24966bb`

This discussion describes only Member 4's assigned contribution. It does not attribute Member 3's V6, V7, V8, or V14 work to Member 4. Before screenshots are source-inspection evidence from the baseline; after screenshots and tests come from the Member 4 implementation. No real secret, credential, token, cookie value, or personal account data is included.

## Findings and controls

### V9: Tokens in logs and stack traces in responses

V9 is classified as OWASP A09:2021, CWE-532, and CWE-209. The baseline allowed credential-bearing values, full objects, and internal error detail to cross logging and response boundaries. This could disclose tokens, user data, source paths, and implementation details to log readers or clients.

The fix introduced allow-listed structured logging with safe operational fields only. Controllers and services no longer pass JWTs, OAuth tokens, passwords, authorization headers, cookies, complete users, or raw provider objects to logging functions. Production 5xx responses are reduced to a generic public message. Development diagnostics are controlled server-side and pass through credential redaction; they are never a reason to return credentials to a client.

- Fix commit: `0d109570a8a1b6b3df8ed607cf295ee09d275eb9`
- Result: V9 group 5 passed, 0 failed
- Evidence: [`V9/`](V9/)

### V11: Email and role enumeration through `/check-email`

V11 is classified as OWASP A07:2021 and CWE-204. The baseline public endpoint queried the user store, returned different existing/non-existing results, and disclosed a stored role. These observable differences supported account discovery and targeted attacks.

The retained compatibility endpoint now validates and normalizes input server-side. For every syntactically valid email it returns the same HTTP status and generic response body, performs no account lookup, echoes no email, and reveals no role. Invalid input receives a safe validation response. Registration and login continue to perform their own normal operations; the enumeration endpoint is not used as an authorization decision.

- Fix commit: `b95bf3b0b927cc15e6c5b0dfabb38810ef5f74b4`
- Result: V11 group 4 passed, 0 failed
- Evidence: [`V11/`](V11/)

### V12: Weak password policy and insecure seed credentials

V12 is classified as OWASP A07:2021 and CWE-521. The baseline duplicated weak minimum-length checks, used a lower bcrypt cost, and stored reusable seed credentials in source. This increased password guessing, offline cracking, and credential reuse risk.

One reusable server-side policy now requires at least eight characters with an uppercase letter, lowercase letter, number, and non-whitespace special character. Registration, administrative creation, initial-admin setup, and reset/change processing call the same policy. Password validation never echoes or logs the submitted password. Hashing uses bcrypt cost 12.

Seed identities and passwords now come from environment variables. If required values are absent or a seed password fails policy, the script reports only a non-secret configuration message and creates no default account. The committed `.env.example` contains placeholders only; the real `.env` was not inspected or copied.

- Fix commit: `c1aa944926c455e3be0349387367eca390454ceb`
- Result: V12 group 12 passed, 0 failed
- Evidence: [`V12/`](V12/)

### V13: Missing security headers and insecure cookie configuration

V13 is classified as OWASP A05:2021 and CWE-693. The baseline had no dedicated early security-header middleware, duplicated authentication-cookie settings, and cleared cookies incompatibly. This weakened browser protection against framing, MIME sniffing, unsafe content interpretation, and session-cookie misuse.

Helmet now runs before CORS, parsers, static files, and API routes. The policy supplies Content-Security-Policy, `X-Content-Type-Options: nosniff`, framing denial, and production HSTS without duplicating contradictory settings. Cross-origin resource and opener policies preserve frontend media loading and the Google OIDC redirect flow. CORS behavior remains explicitly tested.

Authentication cookies are centralized with `httpOnly: true`, `sameSite: "lax"`, path `/`, a 24-hour lifetime, and `secure: true` in production. Logout and profile deletion call `clearCookie` using matching base attributes so the browser can remove the same cookie.

- Fix commit: `aaf015f72ef8687c74d0ec681cb62ef0330d15e4`
- Result: V13 group 8 passed, 0 failed
- Evidence: [`V13/`](V13/)

## Threat modelling with STRIDE

STRIDE was used to reason about trust boundaries rather than treating each code change in isolation:

| STRIDE concern | Member 4 risk | Main control |
|---|---|---|
| Spoofing | Weak passwords or stolen authentication material could support account takeover. | Strong centralized password rules, bcrypt cost 12, and protected cookies. |
| Tampering | Inconsistent session settings could allow a browser to send authentication state in unintended contexts. | One cookie policy with controlled scope, transport, same-site behavior, and compatible clearing. |
| Repudiation | Removing all logs would make security events difficult to investigate, while verbose logs would expose secrets. | Minimal structured events retain safe operation names and status context without credentials or full records. |
| Information disclosure | V9 stack/log output and V11 response differences disclosed sensitive information. | Generic production errors, allow-listed logs, and a uniform `/check-email` response. |
| Denial of service | Unbounded or malformed public input can consume work and create noisy diagnostics. | Early validation and bounded public behavior; broader availability controls remain a group concern. |
| Elevation of privilege | Disclosed roles, weak credentials, or stolen cookies can help target privileged accounts. | No role disclosure, stronger credentials, and browser-enforced cookie protections. |

Not every STRIDE category was a separate assigned vulnerability. The model shows how the four fixes work together across the client, Express middleware, authentication controller, persistence boundary, and external OAuth/email/calendar integrations.

## OWASP ASVS and secure coding standards

The work follows the intent of OWASP ASVS control families for authentication, session management, validation, error handling, logging, data protection, and configuration. CWE identifiers make the coding weakness explicit, while the OWASP Top 10 classifications describe the broader application risk.

Applied secure-coding rules include:

- validate and normalize untrusted data at the server boundary;
- make public responses independent of sensitive internal state;
- keep passwords and tokens out of logs, response bodies, screenshots, and documentation;
- centralize security policy instead of copying options across controllers;
- store deployment credentials outside source control;
- apply browser defenses before application routes execute;
- test both security rejection and ordinary successful behavior.

## Deny-by-default design

The implementation defaults to non-disclosure and refusal when security configuration is missing. The safe logger emits only specifically allowed fields. A production 5xx response exposes only a fixed public message. `/check-email` does not reveal account state. The seed script skips account creation when required environment configuration is missing or weak. Production authentication cookies require secure transport.

This is stronger than trying to blacklist a few known secret names: new or unexpected object properties are not logged unless intentionally admitted to the safe schema.

## Sensitive-data logging and error rules

The logging boundary must never receive passwords, raw tokens, authorization headers, cookies, OAuth credentials, full request bodies, complete user documents, or unfiltered third-party errors. Useful events contain an operation name, safe status, and a small set of non-sensitive diagnostic fields. Secret masking is a secondary safety net, not permission to log sensitive objects.

Expected client errors use controlled status codes and validation messages. Unexpected production failures use a generic 500 response without stack frames, source paths, database details, or provider exceptions. Development diagnostics remain server-side, are deliberately enabled, and must still pass credential redaction.

## Uniform responses against enumeration

An enumeration-resistant response keeps the status, body shape, wording, and account-related work the same for existing and non-existing identities. The `/check-email` controller therefore does not query the user collection at all for valid input. Server-side syntax validation occurs before the uniform acknowledgement. This prevents role disclosure and removes the main timing difference caused by an existence lookup.

The same principle should also guide password recovery: public messages should not confirm whether an address is registered, even when internal processing differs.

## Centralized password and seed policy

Password rules belong in one reusable function so registration, reset, and administrative flows cannot drift. The policy is enforced before hashing or persistence, returns a safe requirement message, and never returns the submitted value. Bcrypt cost is also centralized so all new password hashes use the approved work factor.

Seed data is deployment configuration, not source code. Environment variables must be unique to the deployment and supplied through a protected secret-management channel. Missing configuration causes a safe skip rather than a predictable fallback. Example files document variable names with placeholders only.

## Header, cookie, CORS, and OIDC policy

Helmet establishes a consistent header baseline early in Express. The Content-Security-Policy restricts default content and denies framing; `nosniff` prevents MIME interpretation changes. Policies that affect cross-origin media and window relationships were selected with the separate MERN frontend and Google OIDC callback in mind.

Cookie controls are centralized so login, OAuth callback, logout, and deletion agree. `HttpOnly` blocks direct script access, `SameSite=Lax` reduces cross-site request risk while allowing top-level OAuth navigation, production `Secure` restricts transport to HTTPS, and the finite lifetime limits persistence. CORS remains an independent origin/credential decision and is covered by tests rather than weakened to compensate for cookie settings.

## Verification strategy

### Security regression tests

The Member 4 suite is isolated from real user data and external services. It mocks persistence, JWT creation, email delivery, and Google OAuth boundaries. It verifies rejection and non-disclosure as well as successful registration, login, reset, API, CORS, cookie, logout, and OIDC redirect behavior.

Command from `backend`:

```text
node --experimental-vm-modules ./node_modules/jest/bin/jest.js tests/integration/security.member4.test.js
```

Genuine result: 29 passed, 0 failed, one suite passed, exit code 0. Per group: V9 5, V11 4, V12 12, and V13 8. The test commit is `fa684f8c70fc9e5109880e67b49ebb23c2404f57`.

### SAST, DAST, secret scanning, and dependency scanning

These controls should be continuous quality gates, not one-time claims:

- **SAST:** run a JavaScript-aware analyzer such as CodeQL or Semgrep on pull requests, prioritizing authentication, logging, validation, and injection paths.
- **DAST:** run OWASP ZAP against an isolated localhost/test deployment using synthetic accounts. Check headers, authentication errors, enumeration behavior, and protected routes without contacting real Google, email, or calendar services.
- **Secret scanning:** scan current changes and Git history with a dedicated scanner such as Gitleaks plus repository-host secret protection. Revoke and rotate any confirmed exposed credential; deleting a file alone does not invalidate a secret.
- **Dependency scanning:** review `npm audit` or another software-composition analysis report for both backend and client lockfiles, triage reachability and severity, then update with regression tests.

No SAST, DAST, secret-scan, or dependency-scan result is claimed here because no retained result for those tools forms part of the Member 4 evidence package.

### Code-review security checklist

Reviewers should confirm:

- no secret, token, password, cookie, personal record, or raw request object is logged;
- 5xx production responses contain no stack, path, query, provider, or database detail;
- identity-related public responses do not vary by account existence or role;
- every password write uses the centralized policy and approved bcrypt cost;
- seeds have no hard-coded fallback and fail safely when configuration is absent;
- Helmet runs before routes and no later middleware contradicts its headers;
- cookie set and clear operations use compatible attributes;
- CORS, media, and OIDC behavior are tested with safe mocks;
- security tests include negative cases and normal-functionality checks;
- evidence contains no secret values or personal account data.

## Genuinely unresolved items

### U1 — group-level finding: not fixed

U1 is not an assigned Member 4 vulnerability, and no tracked repository document available on this branch defines its technical scope or provides a verified U1 remediation commit, test, or evidence record. It therefore remains **not fixed** at group level. The group must identify the agreed definition, owner, risk, and acceptance test before making a remediation claim. Member 4 does not claim to have fixed U1.

### U2 — group-level finding: not fixed

U2 is not an assigned Member 4 vulnerability, and no tracked repository document available on this branch defines its technical scope or provides a verified U2 remediation commit, test, or evidence record. It therefore remains **not fixed** at group level. The group must identify the agreed definition, owner, risk, and acceptance test before making a remediation claim. Member 4 does not claim to have fixed U2.

### Pre-existing authentication-test compatibility

The directly affected older authentication run produced 9 passes and 2 failures (exit code 1). Both failing fixtures submit passwords that no longer satisfy V12. The Member 4 production policy was not weakened, and those pre-existing tests were not rewritten as part of the focused security commits. Updating those fixtures is a separate test-maintenance task; it is not evidence that V12 failed.

### Submission links

The pull request, final-report URL, and YouTube URL remain intentionally blank until those artifacts are created through the approved group workflow. No PR was created for this documentation task.

## Conclusion

Member 4's contribution replaces disclosure-prone behavior with explicit safe boundaries: structured logs, generic production failures, enumeration-resistant responses, one password policy, environment-managed seed credentials, early browser headers, and one cookie policy. The dedicated regression suite provides repeatable evidence for all four assigned findings while keeping external services and real credentials out of the test process.
