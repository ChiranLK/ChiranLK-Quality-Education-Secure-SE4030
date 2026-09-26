# Member 3 Security Fixes Manifest

## V6: Student Data Exposure (Core Vulnerability)
- Added authentication gate to GET /api/tutoring-sessions
- Removed PII (participants, tutor email) from response lists
- **Verified via:** Integration Tests V6-T01 through V6-T08

## V7: Missing Authentication (Core Vulnerability)
- Added authentication and admin/tutor role authorization to Google Calendar and Email routes
- **Verified via:** Integration Tests V7-T01 through V7-T19

## V14: Regex Injection (Core Vulnerability)
- Enforced 100 character length limit on query subject
- Escaped regex special characters to be treated literally
- **Verified via:** Integration Tests V14-T01 through V14-T12

## V8: Additional Security Hardening - Current-tree remediated; owner revocation unverified
- V8 is additional security hardening only.
- V8 is not counted among the team’s required seven vulnerabilities.
- The current repository no longer tracks backend/google-tokens.json.
- Historical owner-controlled token revocation could not be independently verified.
- No secret values are reproduced in documentation or evidence.

## Tests
- All 39 Member 3 security integration tests are passing: V6 8/8, V7 19/19, and V14 12/12.
- Output saved to Integration_Test_Results.txt

## Required Manual Action
- The legitimate original account owner should revoke the historical OAuth credentials. The team could not identify or access the original account, so owner-controlled revocation remains unverified.
