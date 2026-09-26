# Member 4 Evidence Index

Member: **NIMADITH LMH — IT23242272**
Baseline: `23faaa1eed6c88a90c8e8daf301d5e72b24966bb`
Member 4 regression suite: **29 passed, 0 failed, exit code 0**

All 24 retained PNGs were reopened with Chromium's image decoder. Every file returned a positive natural width and height and is marked `decoded-ok` below. No combined full-page GitHub diff is used.

## V9 evidence

| Evidence path | Evidence type | Purpose | Decoder result |
|---|---|---|---|
| [`V9/V9_BEFORE_SENSITIVE_LOGGING.png`](V9/V9_BEFORE_SENSITIVE_LOGGING.png) | Baseline source inspection | Shows direct token/user logging expressions without displaying a runtime token | `decoded-ok` — 1560×1018 |
| [`V9/V9_BEFORE_STACK_TRACE_RESPONSE.png`](V9/V9_BEFORE_STACK_TRACE_RESPONSE.png) | Baseline source inspection | Shows stack fields included in the baseline response construction | `decoded-ok` — 1560×985 |
| [`V9/V9_AFTER_SANITIZED_LOGGING.png`](V9/V9_AFTER_SANITIZED_LOGGING.png) | Current source | Shows allow-listed context filtering and safe emitters | `decoded-ok` — 1560×1398 |
| [`V9/V9_AFTER_GENERIC_ERROR_RESPONSE.png`](V9/V9_AFTER_GENERIC_ERROR_RESPONSE.png) | Current source | Shows generic production sanitization and centralized handling | `decoded-ok` — 1560×1263 |
| [`V9/V9_TEST_RESULTS.png`](V9/V9_TEST_RESULTS.png) | Runtime test | Parsed V9 result: 5 passed, 0 failed | `decoded-ok` — 1560×525 |

## V11 evidence

| Evidence path | Evidence type | Purpose | Decoder result |
|---|---|---|---|
| [`V11/V11_BEFORE_ENUMERATION_CODE.png`](V11/V11_BEFORE_ENUMERATION_CODE.png) | Baseline source inspection | Shows public user lookup and role selection | `decoded-ok` — 1560×771 |
| [`V11/V11_BEFORE_DIFFERENT_RESPONSES.png`](V11/V11_BEFORE_DIFFERENT_RESPONSES.png) | Baseline source inspection | Shows differing not-found/found branches; no runtime claim | `decoded-ok` — 1560×819 |
| [`V11/V11_AFTER_UNIFORM_RESPONSE.png`](V11/V11_AFTER_UNIFORM_RESPONSE.png) | Current source | Shows validation/normalization and the uniform safe response | `decoded-ok` — 1560×843 |
| [`V11/V11_AFTER_NO_ROLE_DISCLOSURE.png`](V11/V11_AFTER_NO_ROLE_DISCLOSURE.png) | Current source and test | Shows the response has no email/role and the matching assertion | `decoded-ok` — 1560×1025 |
| [`V11/V11_TEST_RESULTS.png`](V11/V11_TEST_RESULTS.png) | Runtime test | Parsed V11 result: 4 passed, 0 failed | `decoded-ok` — 1560×525 |

## V12 evidence

| Evidence path | Evidence type | Purpose | Decoder result |
|---|---|---|---|
| [`V12/V12_BEFORE_WEAK_POLICY.png`](V12/V12_BEFORE_WEAK_POLICY.png) | Baseline source inspection | Shows six-character validation and bcrypt cost 10 | `decoded-ok` — 1560×763 |
| [`V12/V12_BEFORE_HARDCODED_SEED_REDACTED.png`](V12/V12_BEFORE_HARDCODED_SEED_REDACTED.png) | Redacted baseline source | Proves hard-coded credential fields existed while removing their values and personal fields | `decoded-ok` — 1560×1104 |
| [`V12/V12_AFTER_PASSWORD_POLICY.png`](V12/V12_AFTER_PASSWORD_POLICY.png) | Current source | Shows the reusable strong policy and controller enforcement | `decoded-ok` — 1560×859 |
| [`V12/V12_AFTER_SAFE_SEED_CONFIGURATION.png`](V12/V12_AFTER_SAFE_SEED_CONFIGURATION.png) | Current source | Shows environment references and fail-safe missing/weak checks | `decoded-ok` — 1560×1470 |
| [`V12/V12_TEST_RESULTS.png`](V12/V12_TEST_RESULTS.png) | Runtime test | Parsed V12 result: 12 passed, 0 failed | `decoded-ok` — 1560×525 |

## V13 evidence

| Evidence path | Evidence type | Purpose | Decoder result |
|---|---|---|---|
| [`V13/V13_BEFORE_MISSING_HEADERS.png`](V13/V13_BEFORE_MISSING_HEADERS.png) | Baseline source inspection | Shows middleware order without Helmet/security headers | `decoded-ok` — 1560×914 |
| [`V13/V13_BEFORE_COOKIE_CONFIGURATION.png`](V13/V13_BEFORE_COOKIE_CONFIGURATION.png) | Redacted baseline source | Shows incomplete login/logout attributes with cookie values omitted | `decoded-ok` — 1560×882 |
| [`V13/V13_AFTER_HELMET_HEADERS.png`](V13/V13_AFTER_HELMET_HEADERS.png) | Current source | Shows Helmet/CSP configuration and early middleware registration | `decoded-ok` — 1560×1263 |
| [`V13/V13_AFTER_SECURE_COOKIE_ATTRIBUTES.png`](V13/V13_AFTER_SECURE_COOKIE_ATTRIBUTES.png) | Current source | Shows centralized cookie and compatible clear options | `decoded-ok` — 1560×954 |
| [`V13/V13_TEST_RESULTS.png`](V13/V13_TEST_RESULTS.png) | Runtime test | Parsed V13 result: 8 passed, 0 failed | `decoded-ok` — 1560×525 |

## Git evidence

| Evidence path | Evidence type | Purpose | Decoder result |
|---|---|---|---|
| [`Git/MEMBER4_BRANCH.png`](Git/MEMBER4_BRANCH.png) | Git command | Shows the dedicated Member 4 branch | `decoded-ok` — 1560×271 |
| [`Git/MEMBER4_FOCUSED_COMMITS.png`](Git/MEMBER4_FOCUSED_COMMITS.png) | Git command | Shows focused V9, V11, V12, V13, and test commits | `decoded-ok` — 1560×390 |
| [`Git/MEMBER4_FINAL_TEST_SUMMARY.png`](Git/MEMBER4_FINAL_TEST_SUMMARY.png) | Runtime test summary | Shows parsed per-group and overall results | `decoded-ok` — 1560×502 |
| [`Git/MEMBER4_CLEAN_STATUS.png`](Git/MEMBER4_CLEAN_STATUS.png) | Git command | Shows the clean implementation tree before evidence generation and a clean `diff --check` | `decoded-ok` — 1560×494 |

## Machine-readable validation

[`png-validation.json`](png-validation.json) records the baseline/current commit identifiers, branch, fresh test exit code and totals, group results, decoder name, dimensions, and `decoded-ok` status for every retained PNG.

## Secret-safety review

- Real `.env` and `google-tokens.json` contents were not inspected, displayed, copied, or rendered.
- No runtime token or cookie value is shown.
- No real password, client secret, or personal email address is shown.
- Baseline seed credentials and personal fields are visibly redacted.
- External services were mocked for the regression run.
