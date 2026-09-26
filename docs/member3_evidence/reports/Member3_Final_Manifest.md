# Member 3 Security Fixes Manifest

## V6: Student Data Exposure
- Added authentication gate to GET /api/tutoring-sessions
- Removed PII (participants, tutor email) from response lists
- **Verified via:** Integration Tests V6-T01 through V6-T08

## V7: Missing Authentication
- Added authentication and admin/tutor role authorization to Google Calendar and Email routes
- **Verified via:** Integration Tests V7-T01 through V7-T19

## V14: Regex Injection
- Enforced 100 character length limit on query subject
- Escaped regex special characters to be treated literally
- **Verified via:** Integration Tests V14-T01 through V14-T11

## Tests
- All 38 security integration tests are passing.
- Output saved to Member3_Integration_Test_Results.txt

## Required Manual Action
- Please revoke the exposed Google OAuth tokens in the Google Cloud Console.
