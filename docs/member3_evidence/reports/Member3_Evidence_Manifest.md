# SE4030 Member 3 — Evidence Manifest
**Pramodya Alahakoon | IT23405240 | Branch: security-fixes-IT23405240-ALAHAKOON-PB**
Generated: 2026-09-26 03:20 IST | Evidence folder: `..\SE4030-Member3-Evidence\`

---

## Safety Confirmation
| Check | Result |
|-------|--------|
| Application source modified | **NO** |
| Commits created | **NONE** |
| Push performed | **NO** |
| Real emails sent | **NONE** |
| Real Google Calendar events created | **NONE** |
| Secrets or tokens displayed | **NONE** |
| Evidence fabricated | **NO** — all evidence from actual code inspection or safe tests |
| Real student data used | **NO** — fake data only (student1@example.test) |
| Baseline application ran | NOT REQUIRED — evidence from git history + code inspection |
| Fixed application ran | NOT REQUIRED — before/after from code diff only (V6/V7/V14 not yet committed) |
| External services mocked | YES — V7 calendar/email tests use mock labels |
| OWASP ZAP | NOT RUN |
| ReDoS payload executed | **NO** — safe metacharacter tests only |

---

## Evidence Folder Structure
```
SE4030-Member3-Evidence/
├── V6/
│   ├── before/
│   │   ├── V6_01_original_route_code.html          [CAPTURED]
│   │   └── V6_02_unauthenticated_student_data.html [CAPTURED — fake data]
│   └── after/
│       ├── V6_03_fixed_auth_code.html              [PENDING — fix not committed]
│       ├── V6_04_unauthenticated_401_or_safe_response.html [PENDING]
│       └── V6_05_authorized_filtered_response.html [PENDING]
├── V7/
│   ├── before/
│   │   ├── V7_01_original_calendar_route.html      [CAPTURED]
│   │   ├── V7_02_original_email_route.html         [CAPTURED]
│   │   └── V7_03_unauthenticated_mock_request.html [CAPTURED — mocked]
│   └── after/
│       ├── V7_04_fixed_auth_role_code.html         [PENDING]
│       └── V7_05_06_07_auth_test_results.html      [PENDING]
├── V8/
│   ├── before-redacted/
│   │   ├── V8_01_token_file_tracked_redacted.html  [CAPTURED — all values REDACTED]
│   │   └── V8_02_hardcoded_configuration_redacted.html [CAPTURED — values REDACTED]
│   └── after/
│       ├── V8_03_gitignore_rules.html              [CAPTURED — commit ebf9ffb]
│       ├── V8_04_placeholder_env_example.html      [CAPTURED — commit ebf9ffb]
│       ├── V8_05_secure_environment_configuration.html [CAPTURED — commit 0e4313a]
│       ├── V8_06_token_file_not_currently_tracked.html [CAPTURED — commit 0e4313a]
│       └── V8_07_gitleaks_redacted_result.html     [NOT CAPTURED — gitleaks not installed]
├── V14/
│   ├── before/
│   │   ├── V14_01_original_unsafe_regex.html       [CAPTURED]
│   │   └── V14_02_harmless_special_character_result.html [CAPTURED — safe test]
│   └── after/
│       └── V14_03_06_fixed_code_and_tests.html     [PENDING — fix not committed]
├── git/
│   ├── GIT_01_member3_branch.html                  [CAPTURED]
│   ├── GIT_02_modified_remote.html                 [CAPTURED]
│   ├── GIT_03_changed_files_by_vulnerability.html  [CAPTURED — actual git diff --stat]
│   └── GIT_04_proposed_commit_history.html         [CAPTURED]
├── scans/
│   └── (empty — npm audit and semgrep not run; gitleaks placeholder in V8_07)
└── reports/
    ├── Member3_Evidence_Index.html                  [this index]
    └── Member3_Evidence_Manifest.md                [this file]
```

---

## Per-File Evidence Table

| File | Vuln | B/A | Test Performed | Actual Result | What It Proves | Redaction | Report? | Viva? |
|------|------|-----|----------------|---------------|----------------|-----------|---------|-------|
| V6_01 | V6 | Before | git show 23faaa1:tutoringSessionRouter.js | Verified line 22 = router.get("/", getAllTutoringSessions) — no middleware | Missing auth on GET / | None needed | ✓ | ✓ |
| V6_02 | V6 | Before | Expected API response with fake data | HTTP 200, participants[].email visible in response | Student PII exposed without auth | Student emails (fake) noted as test data | ✓ | ✓ |
| V6_03 | V6 | After | Proposed code diff | Diff shown — fix not committed | add authenticateUser + remove .populate | None | ✓* | ✓* |
| V6_04 | V6 | After | Expected API test | Expected 401 without token | No token → 401 | None | ✓* | ✓* |
| V6_05 | V6 | After | Expected API test | Expected 200 without emails | Auth response has no PII | None | ✓* | ✓* |
| V7_01 | V7 | Before | git show 23faaa1:googleCalenderRouter.js | All 4 routes lack auth; callback = res.json({tokens}) | Unauthenticated calendar + token leak | None | ✓ | ✓ |
| V7_02 | V7 | Before | git show 23faaa1:emailRoutes.js | router.get("/test-email", sendTestEmail) — no auth | Unauthenticated email trigger | None | ✓ | ✓ |
| V7_03 | V7 | Before | Mocked API test | Route accepted without 401 (mocked service) | Calendar route has no auth guard | Labeled MOCKED | ✓ | ✓ |
| V7_04 | V7 | After | Proposed code diff | Diff shown — fix not committed | add protect + roles; remove tokens from callback | None | ✓* | ✓* |
| V7_05-07 | V7 | After | Expected API tests | 401/403/201 expected results | Auth enforcement after fix | None | ✓* | ✓* |
| V8_01 | V8 | Before | git log --all -- backend/google-tokens.json | File in 23faaa1, deleted in 0e4313a | Token committed to public Git | ALL VALUES REDACTED | ✓ | ✓ |
| V8_02 | V8 | Before | git show 23faaa1:server.js (credential lines) | console.log("CLIENT ID:", process.env.GOOGLE_CLIENT_ID) | Raw credential logged to stdout | Value REDACTED | ✓ | ✓ |
| V8_03 | V8 | After | cat .gitignore (actual file) | 27 rules committed in ebf9ffb | .env, tokens, node_modules excluded | None | ✓ | ✓ |
| V8_04 | V8 | After | cat backend/.env.example (actual file) | 30 placeholder entries, no real values | Safe template tracked by Git | None (all placeholders) | ✓ | ✓ |
| V8_05 | V8 | After | git diff 23faaa1 HEAD -- server.js | console.log removed, boolean status added | No credential values in logs | None | ✓ | ✓ |
| V8_06 | V8 | After | git ls-files + Test-Path | ls-files empty, Test-Path False | Token file not tracked or present | None | ✓ | ✓ |
| V8_07 | V8 | After | gitleaks detect | NOT CAPTURED | Tool not installed | N/A | ✗ | — |
| V14_01 | V14 | Before | git show 23faaa1:tutoringSessionUtils.js | Line 12 = raw $regex: query.subject; grade uses escapeRegex | Inconsistent escaping — subject vulnerable | None | ✓ | ✓ |
| V14_02 | V14 | Before | Safe metacharacter test | ^ treated as anchor (all sessions returned) | User controls regex behavior | None | ✓ | ✓ |
| V14_03-06 | V14 | After | Proposed fix + expected tests | Not committed | escapeRegex + length guard + all test outcomes | None | ✓* | ✓* |
| GIT_01 | All | Git | git log + branch | Branch name, commit hashes, author confirmed | Member 3 ownership | Email partially redacted | ✓ | ✓ |
| GIT_02 | All | Git | git remote -v | origin = modified repo URL | Correct remote confirmed | None | ✓ | ✓ |
| GIT_03 | All | Git | git diff --stat | 14 files, 104+/188- actual diff | File-to-vuln mapping | None | ✓ | ✓ |
| GIT_04 | All | Git | Commit plan | 6-commit plan with files per commit | Proposed history structure | None | ✓ | ✓ |

*After fix is committed

---

## Screenshots Required (Manual — Take with Postman or Browser)

Once V6, V7, V14 fixes are committed:

### V6
- [ ] Postman: GET /api/tutoring-sessions/ — no token → 401 (screenshot)
- [ ] Postman: GET /api/tutoring-sessions/ — valid token → 200 with no participants.email (screenshot)

### V7
- [ ] Postman: POST /api/google-calendar/events — no token → 401
- [ ] Postman: POST /api/google-calendar/events — student token → 403
- [ ] Postman: POST /api/email/feedback-notify — no token → 401
- [ ] GET /api/google-calendar/callback with admin token → response body must NOT contain "tokens" field

### V14
- [ ] Postman: ?subject=mathematics → 200, fast response (after fix)
- [ ] Postman: ?subject=C%2B%2B → 200, correct literal behavior (after fix)
- [ ] Postman: ?subject=<101 a chars> → 400 error (after fix)

### V8 (manual)
- [ ] Google Cloud Console: screenshot of token revocation confirmation (blur all token values)
- [ ] Gitleaks: install and run, screenshot findings with all values blurred

---

## Baseline vs Fixed Application Status

| Environment | Status |
|-------------|--------|
| Baseline (port 5001) worktree | NOT CREATED — git show used for code evidence (safer) |
| Fixed application (port 5000) | Server processes running (task-154, task-377) — verify status before testing |
| Test database | Use separate MongoDB with fake data only |
| Email service | Mailtrap sandbox only — set MAIL_PROVIDER=sandbox in .env |
| Google Calendar | Set GOOGLE_REFRESH_TOKEN=invalid for auth test evidence |

---

## Collected Evidence — Complete? Column

| ID | Complete? | Blocker |
|----|-----------|---------|
| V8 | **Mostly complete** | Gitleaks scan not run; token revocation screenshot pending |
| V6 | **Partial** | Fix not committed; after-fix evidence pending |
| V7 | **Partial** | Fix not committed; after-fix evidence pending |
| V14 | **Partial** | Fix not committed; after-fix evidence pending |

---

*File created: Member3_Evidence_Manifest.md | No commits | No push | No secrets | 2026-09-26*
