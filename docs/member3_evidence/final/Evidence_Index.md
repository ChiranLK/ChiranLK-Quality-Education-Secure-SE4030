# Member 3 Evidence Index
  
| Figure ID | Vulnerability | Title | Command/Source | Labels & Limitations |
| :--- | :--- | :--- | :--- | :--- |
| V6/V6_BEFORE_ROUTE | V6 | V6 Before - Tutoring Session Routes (Missing Auth) | `git show 23faaa1:backend/Routes/tutoringSessionRouter.js` | Source-code baseline evidence, Runtime baseline unavailable |
| V6/V6_BEFORE_PII_SERVICE | V6 | V6 Before - Tutoring Session Service (PII Population) | `git show 23faaa1:backend/services/tutoringSessionService.js` | Source-code baseline evidence, Runtime baseline unavailable |
| V6/V6_AFTER_AUTH_CODE | V6 | V6 After - Protected Route Code | `git show e4e1b68:backend/Routes/tutoringSessionRouter.js` | Actual committed fixed route code, Commit e4e1b68 |
| V6/V6_AFTER_DATA_MINIMIZATION | V6 | V6 After - Data Minimization Code | `git show e4e1b68:backend/services/tutoringSessionService.js` | Actual committed service code, Commit e4e1b68 |
| V6/V6_TEST_RESULTS | V6 | V6 Genuine Jest Test Results | `npm run test tests/integration/security.member3.test.js (Filtered for V6)` | Genuine test execution output, 8/8 PASS, Synthetic/Mock Data |
| V7/V7_BEFORE_CALENDAR_ROUTES | V7 | V7 Before - Google Calendar Routes (Missing Auth) | `git show 23faaa1:backend/Routes/googleCalenderRouter.js` | Source-code baseline evidence, Runtime baseline unavailable |
| V7/V7_BEFORE_EMAIL_ROUTES | V7 | V7 Before - Email Routes (Missing Auth) | `git show 23faaa1:backend/Routes/emailRoutes.js
git show 23faaa1:backend/Routes/feedbackEmailRoutes.js` | Source-code baseline evidence, Runtime baseline unavailable |
| V7/V7_AFTER_PROTECTED_ROUTES | V7 | V7 After - Protected Auth Routes | `git show a1e1d4c:backend/Routes/googleCalenderRouter.js` | Actual committed fixed route code, Commit a1e1d4c |
| V7/V7_AFTER_CALLBACK_SANITIZATION | V7 | V7 After - Callback Response Sanitization | `git show a1e1d4c:backend/Routes/googleCalenderRouter.js (Callback Route)` | Actual fixed callback code, Commit a1e1d4c |
| V7/V7_TEST_RESULTS | V7 | V7 Genuine Jest Test Results | `npm run test tests/integration/security.member3.test.js (Filtered for V7)` | Genuine test execution output, 19/19 PASS, Google/Email Providers Mocked |
| V14/V14_BEFORE_RAW_REGEX | V14 | V14 Before - Unsafe Raw Regex | `git show 23faaa1:backend/utils/tutoringSessionUtils.js` | Source-code baseline evidence, Runtime baseline unavailable |
| V14/V14_AFTER_ESCAPE_LENGTH | V14 | V14 After - Escaped Regex & Length Validations | `git show 8f42865:backend/utils/tutoringSessionUtils.js` | Actual fixed utils code, Commit 8f42865 |
| V14/V14_DIFF | V14 | V14 Git Diff (Before vs After) | `git diff 23faaa1..8f42865 -- backend/utils/tutoringSessionUtils.js` | Actual Git Diff |
| V14/V14_TEST_RESULTS | V14 | V14 Genuine Jest Test Results | `npm run test tests/integration/security.member3.test.js (Filtered for V14)` | Genuine test execution output, 12/12 PASS, No stress testing performed |
| V8/V8_BEFORE_TRACKED_FILE | V8 | V8 Before - Hardcoded Token Tracked in Git | `git ls-tree -r --name-only 23faaa1 | findstr google-tokens.json` | Source-code baseline evidence, Tracked in initial commit |
| V8/V8_AFTER_NOT_TRACKED | V8 | V8 After - Files Ignored/Untracked | `git ls-files backend/google-tokens.json
git ls-files backend/.env` | Actual Git output, Files untracked successfully |
| V8/V8_AFTER_GITIGNORE_ENV | V8 | V8 After - .gitignore & .env.example | `cat .gitignore && cat backend/.env.example` | Secure configuration, All displayed values are placeholders |
| V8/V8_HISTORY_LIMITATION | V8 | V8 History Limitation (Scanner Unavailable) | `git log --oneline -- backend/google-tokens.json` | Scanner evidence unavailable, Partially Fixed pending token revocation |
| Git/MEMBER3_COMMIT_HISTORY | Git | Member 3 Final Commit History | `git log --oneline --decorate -n 15` | Actual Git log |
| Git/MEMBER3_FILE_ISOLATION | Git | Member 3 File Isolation Check | `git show --name-status e4e1b68 a1e1d4c 8f42865 781f936 47d573f` | Actual Git name-status |

### Report Status Correction
- V6 before source evidence: Captured
- V6 baseline runtime evidence: Unavailable
- V7 before source evidence: Captured
- V7 baseline runtime evidence: Unavailable
- V14 before source evidence: Captured
- V14 baseline runtime evidence: Unavailable
- V8 tracked-file baseline evidence: Captured
- V8 scanner evidence: Unavailable
- V8 status: CURRENT-TREE REMEDIATED / OWNER REVOCATION UNVERIFIED

The historically committed backend/google-tokens.json file was removed from the current repository and blocked using .gitignore. A safe .env.example containing placeholders only is provided. The OAuth application name, Client ID, Google Cloud project, and authorizing Google account could not be determined from repository evidence. Token revocation could not be independently verified because the credential originated from the historical third-party baseline and the team does not control the original Google account. The historical baseline remains available only as required assignment evidence. V8 is documented as additional security hardening and is not counted among the team's required seven vulnerabilities.
