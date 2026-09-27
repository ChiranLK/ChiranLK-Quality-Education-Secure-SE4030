# ChiranLK-Quality-Education-Secure-SE4030
SSD

## Member 4 security contribution

- **Member:** NIMADITH LMH
- **Student ID:** IT23242272
- **Branch:** `security-fixes-IT23242272-NIMADITH-LMH`
- **Assigned scope:** V9, V11, V12, and V13

### Implemented fixes

| Finding | Title | Implemented fix summary |
|---|---|---|
| V9 | Tokens in logs and stack traces in responses | Replaced sensitive object logging with allow-listed structured events and made production server errors generic. |
| V11 | Email and role enumeration through `/check-email` | Validates and normalizes email input, then returns one uniform response without looking up or disclosing an account or role. |
| V12 | Weak password policy and insecure seed credentials | Centralized the strong password policy, set bcrypt cost 12, and moved fail-safe seed credentials to environment configuration. |
| V13 | Missing security headers and insecure cookie configuration | Added early Helmet/CSP protection and centralized secure authentication-cookie and logout attributes. |

### Member 4 regression tests

Run from the repository root:

```powershell
cd backend
node --experimental-vm-modules ./node_modules/jest/bin/jest.js tests/integration/security.member4.test.js
```

Genuine recorded result: **29 passed, 0 failed; 1 suite passed; exit code 0**.

| Group | Passed | Failed |
|---|---:|---:|
| V9 | 5 | 0 |
| V11 | 4 | 0 |
| V12 | 12 | 0 |
| V13 | 8 | 0 |

### Evidence and supporting material

- Evidence manifest: [`docs/member4_evidence/Final_Manifest.md`](docs/member4_evidence/Final_Manifest.md)
- Evidence index: [`docs/member4_evidence/final/Evidence_Index.md`](docs/member4_evidence/final/Evidence_Index.md)
- V9 evidence: [`docs/member4_evidence/final/V9/`](docs/member4_evidence/final/V9/)
- V11 evidence: [`docs/member4_evidence/final/V11/`](docs/member4_evidence/final/V11/)
- V12 evidence: [`docs/member4_evidence/final/V12/`](docs/member4_evidence/final/V12/)
- V13 evidence: [`docs/member4_evidence/final/V13/`](docs/member4_evidence/final/V13/)
- Git evidence: [`docs/member4_evidence/final/Git/`](docs/member4_evidence/final/Git/)
- Security discussion: [`docs/member4_evidence/final/Member4_Discussion.md`](docs/member4_evidence/final/Member4_Discussion.md)
- Video guide: [`docs/member4_evidence/final/Member4_Video_Script.md`](docs/member4_evidence/final/Member4_Video_Script.md)

### Member 4 commits

| Commit | Purpose |
|---|---|
| `0d109570a8a1b6b3df8ed607cf295ee09d275eb9` | V9 implementation |
| `b95bf3b0b927cc15e6c5b0dfabb38810ef5f74b4` | V11 implementation |
| `c1aa944926c455e3be0349387367eca390454ceb` | V12 implementation |
| `aaf015f72ef8687c74d0ec681cb62ef0330d15e4` | V13 implementation |
| `fa684f8c70fc9e5109880e67b49ebb23c2404f57` | Member 4 regression tests |
| `b85a630de68a5b777b1d4f4f7d5a575a9df007b5` | Final security evidence package |

### Submission links

- Pull request: **To be added after the PR is created**
- Final report: **Link to be added after publication**
- YouTube video: **Link to be added after upload**

The Member 4 source, tests, screenshots, and documentation include no real passwords, tokens, cookie values, client secrets, `.env` contents, or personal account data.
